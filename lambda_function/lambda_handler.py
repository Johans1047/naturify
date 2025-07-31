from botocore.exceptions import ClientError, BotoCoreError
import json, boto3, base64, uuid, cv2, traceback, time, re
from datetime import datetime
from decimal import Decimal
import numpy as np

def convert_floats_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimal(v) for v in obj]
    return obj

def enhance_landscape_lambda(image_bytes):
    
    nparr = np.frombuffer(image_bytes, np.uint8)
    imagen = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 3. Convertir a float32 y normalizar
    img_float = imagen.astype(np.float32) / 255.0

    # 4. Aplicar tone mapping Drago
    tonemap_drago = cv2.createTonemapDrago(1.0, 0.7)
    hdr_drago = tonemap_drago.process(img_float)

    # 5. Corregir valores NaN o infinitos
    hdr_drago = np.nan_to_num(hdr_drago, nan=0.0, posinf=1.0, neginf=0.0)
    hdr_drago = np.clip(hdr_drago * 255, 0, 255).astype(np.uint8)

    # 6. Codificar imagen HDR resultante a JPG
    _, buffer = cv2.imencode('.jpg', hdr_drago)

    return buffer.tobytes()

def s3_upload_file(s3_client, bucket_name, file_name, file_type, image_bytes):
        
    # Upload original image to original S3 bucket
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=file_name,
            Body=image_bytes,
            ContentType=file_type
        )

        # Generate presigned URL for accessing the uploaded image
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file_name},
            ExpiresIn=3600 * 24  # 24 hours
        )
        
        return presigned_url
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': f's3_client bucket {bucket_name} does not exist'
                })
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': f'S3 upload failed: {str(e)}'
                })
            }
            
def rekognition_detect_labels(rekognition_client, bucket_name, file_name):
        
    # Dictionary to store results
    results = {
        'fileName': file_name,
        'labels': [],
        'processedAt': datetime.now().isoformat(),
        'status': 'processed',
        'errors': []
    }
    
    # Detect labels with error handling
    try:
        labels_response = rekognition_client.detect_labels(
            Image={'S3Object': {'Bucket': bucket_name, 'Name': file_name}},
            MaxLabels=10,
            MinConfidence=75
        )
        
        results['labels'] = [
            {
                'Name': label['Name'],
                'Confidence': round(label['Confidence'], 2),
                'Categories': [cat['Name'] for cat in label.get('Categories', [])]
            }
            for label in labels_response.get('Labels', [])
        ]

    except Exception as e:
        error_msg = f'Label detection failed: {str(e)}'
        results['errors'].append(error_msg)
        
    return results

def invoke_deepseek_model(bedrock_client, labels):
    # DeepSeek Model ARN from AWS Bedrock
    model_id = "us.deepseek.r1-v1:0"
    
    # Setup the system prompts and messages to send to the model.
    # The system prompt is a fixed instruction for the model (the context).
    # The message is the user input that includes the labels detected in the image.
    system_prompt = [{"text": "Eres una aplicacion que recibe etiquetas referentes a imagenes de paisajes naturales y en base a ellas generas una descripcion de la imagen de entre 7 y 12 palabras. Por ejemplo: 'Hermoso cielo despejado cerca del rio', ese tipo de descripciones, nada de parrafos largos ni enciclopedias"}]

    message = [{
        "role": "user",
        "content": [{"text": f"Analiza esta imagen que contiene las siguientes etiquetas detectadas: {', '.join(labels)}. Proporciona una descripción detallada."}]
    }]

    # Base inference parameters to use.
    inference_config = {
        "maxTokens": 1024,
        "temperature": 0.7,
        "topP": 0.9,
    }

    # Send the message.
    response = bedrock_client.converse(
        modelId=model_id,
        messages=message,
        system=system_prompt,
        inferenceConfig=inference_config,
    )

    return response

def initialize_vars_and_boto3_clients():
    # Bucket names
    original_bucket = "pictures-rekog-bucket"
    enhanced_bucket = "enhanced-pictures-rekog-bucket"
    
    # Initialize AWS clients with timeout configuration
    config = boto3.session.Config(
        read_timeout=60,
        connect_timeout=10,
        retries={'max_attempts': 2}
    )
    
    s3_client = boto3.client('s3', config=config)
    rekognition_client = boto3.client('rekognition', config=config)
    bedrock_client = boto3.client('bedrock-runtime', config=config)
    dynamodb_client = boto3.resource('dynamodb')
    
    return original_bucket, enhanced_bucket, s3_client, rekognition_client, bedrock_client, dynamodb_client

def lambda_handler(event, context):
    try:
        # Extract image data and file name from event
        image_data = event.get('image')
        file_name = event.get('fileName')
        file_type = event.get('fileType', 'image/jpeg')

        if not image_data:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Image data not found in the event'
                })
            }

        # Decode image data
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Failed to decode image: {str(e)}'
                })
            }

        # Initialize variables and Boto3 clients
        original_bucket, enhanced_bucket, s3_client, rekognition_client, bedrock_client, dynamodb_client = initialize_vars_and_boto3_clients()
        
        # Upload original image to S3
        image_url = s3_upload_file(s3_client, original_bucket, file_name, file_type, image_bytes)
        
        # Detect labels using Rekognition
        results = rekognition_detect_labels(rekognition_client, original_bucket, file_name)

        # Store the original image URL in results
        results['url'] = image_url
        
        # Generate description with DeepSeek
        deep_response = None
        try:
            labels = [label['Name'] for label in results['labels']]
            deep_response = invoke_deepseek_model(bedrock_client, labels)
        except Exception as e:
            error_msg = f'DeepSeek description failed: {str(e)}'
            results['errors'].append(error_msg)
            
        # Enhance the image using OpenCV (simulated HDR)
        enhanced_image_bytes = None
        try:
            enhanced_image_bytes = enhance_landscape_lambda(image_bytes)
        except Exception as e:
            error_msg = f'Image enhancement failed: {str(e)}'
            results['errors'].append(error_msg)
        
        # Upload enhanced image to S3
        name_parts = file_name.rsplit('.', 1)
        enhanced_file_name = f"{name_parts[0]}_enhanced.{name_parts[1] if len(name_parts) > 1 else 'jpg'}"
        enhanced_file_type='image/jpg'
        enhanced_image_url = s3_upload_file(s3_client, enhanced_bucket, enhanced_file_name, enhanced_file_type, enhanced_image_bytes)
        
        # Store the enhanced image URL in results
        results['enhanced_url'] = enhanced_image_url
            
        # Process summary
        results['summary'] = {
            'totalLabels': len(results['labels']),
            'hasErrors': len(results['errors']) > 0,
            'enhancementApplied': True if enhanced_image_url else False
        }

        record_id = str(uuid.uuid4())
        table = dynamodb_client.Table('rekognitionImagesTable')

        # Transform floats elements to Decimal
        dynamodb_item = {
            # Ids
            'process_id': record_id,
            'user_id': 'anonymous',
            
            # file metadata
            'file_name': file_name,
            'file_type': file_type,
            'url': results['url'],
            
            # Enhanced file metadata
            'enhanced_file_name': enhanced_file_name,
            'enhanced_file_type': enhanced_file_type,
            'enhanced_url': results['enhanced_url'],
            
            # labels info (solo nombres para búsquedas rápidas)
            'labels': [label['Name'] for label in results['labels']],
            'labels_details': results['labels'],  # Esto contiene floats que necesitan conversión
            
            # AI description
            'description': re.search(r'"([^"]+)"', deep_response['output']['message']['content'][0]['text']).group(1) if deep_response else None,
            
            # status and dates
            'status': 'completed',
            'created_at': datetime.now().isoformat(),
            'processed_at': results['processedAt'],

            # Processing details
            'processing_summary': results['summary']
        }

        dynamodb_item_converted = convert_floats_to_decimal(dynamodb_item)

        # Store item in DynamoDB
        table.put_item(Item=dynamodb_item_converted)

        # Small delay
        time.sleep(1)

        table_response_item = table.get_item(
            Key={
                'process_id': record_id,
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            'response': table_response_item['Item'],
            'body': json.dumps({
                'message': 'Image processed successfully',
            }, ensure_ascii=False)
        }
        
    except Exception as e:    
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e),
                'traceback': traceback.format_exc()
            })
        }