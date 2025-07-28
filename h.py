import json
import boto3
import base64
import uuid
import cv2
import numpy as np
from datetime import datetime
import traceback
from botocore.exceptions import ClientError, BotoCoreError

def enhance_landscape_lambda(image_bytes):
    # Convertir bytes a imagen
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # HDR simple con OpenCV
    # 1. CLAHE para contraste
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    lab[:,:,0] = clahe.apply(lab[:,:,0])
    
    # 2. Aumentar saturación
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    # 3. Ajuste gamma para paisajes
    gamma = 0.8
    enhanced = np.power(enhanced/255.0, gamma) * 255
    enhanced = enhanced.astype(np.uint8)
    
    # Convertir de vuelta a bytes
    _, buffer = cv2.imencode('.jpg', enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return buffer.tobytes()

def s3_upload_file(bucket_name, config, file_name, file_type, image_bytes):
    s3 = boto3.client('s3', config=config)
        
    # Upload original image to original S3 bucket
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=file_name,
            Body=image_bytes,
            ContentType=file_type
        )
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': f'S3 bucket {bucket_name} does not exist'
                })
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': f'S3 upload failed: {str(e)}'
                })
            }
            
def rekognition_detect_labels(bucket_name, file_name, config):
    rekognition = boto3.client('rekognition', config=config)
        
    # Process with Rekognition
    results = {
        'fileName': file_name,
        'labels': [],
        'processedAt': datetime.now().isoformat(),
        'status': 'processed',
        'errors': []
    }
    
    # Detect labels with error handling
    try:
        labels_response = rekognition.detect_labels(
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

def invoke_deepseek_model(image_bytes, labels):
    # Create a Bedrock Runtime client in the AWS Region.
    bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-2")

    # ARN DeepSeek model
    model_id = "us.deepseek.r1-v1:0"
    
    # Setup the system prompts and messages to send to the model.
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

def lambda_handler(event, context):
    original_bucket = "pictures-rekog-bucket"
    enhanced_bucket = "enhanced-pictures-bucket"
    
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
        
        # Initialize AWS clients with timeout configuration
        config = boto3.session.Config(
            read_timeout=60,
            connect_timeout=10,
            retries={'max_attempts': 2}
        )
        
        # Upload original image to S3
        s3_upload_file(original_bucket, config, file_name, image_bytes, file_type)
        
        # Detect labels using Rekognition
        results = rekognition_detect_labels(original_bucket, file_name, config)
        
        # Generate description with DeepSeek
        deep_response = None
        try:
            labels = [label['Name'] for label in results['labels']]
            deep_response = invoke_deepseek_model(image_bytes, labels)
        except Exception as e:
            error_msg = f'DeepSeek description failed: {str(e)}'
            results['errors'].append(error_msg)
            
        # Process summary
        results['summary'] = {
            'totalLabels': len(results['labels']),
            'hasErrors': len(results['errors']) > 0,
            'enhancementApplied': enhanced_image_bytes is not None
        }
        
        # Enhance landscape image
        enhanced_image_bytes = None
        enhanced_file_name = None
        enhanced_url = None
        
        s3 = boto3.client('s3', config=config)
        
        try:
            # Apply landscape enhancement
            enhanced_image_bytes = enhance_landscape_lambda(image_bytes)
            
            # Generate enhanced file name
            name_parts = file_name.rsplit('.', 1)
            enhanced_file_name = f"{name_parts[0]}_enhanced.{name_parts[1] if len(name_parts) > 1 else 'jpg'}"
            
            # Upload enhanced image to separate bucket
            s3.put_object(
                Bucket=enhanced_bucket,
                Key=enhanced_file_name,
                Body=enhanced_image_bytes,
                ContentType=file_type
            )
            
            # Generate presigned URL for enhanced image (optional)
            enhanced_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': enhanced_bucket, 'Key': enhanced_file_name},
                ExpiresIn=3600 * 12  # 12 hours
            )
            
            results['enhanced'] = {
                'fileName': enhanced_file_name,
                'bucket': enhanced_bucket,
                'url': enhanced_url,
                'processedAt': datetime.now().isoformat()
            }
            
        except Exception as e:
            error_msg = f'Image enhancement failed: {str(e)}'
            results['errors'].append(error_msg)
        
        # Optional: Clean up original image if enhancement was successful
        # if enhanced_image_bytes and not results['errors']:
        #     try:
        #         s3.delete_object(Bucket=original_bucket, Key=file_name)
        #     except Exception as e:
        #         print(f"Failed to clean up original file: {str(e)}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': 'Image processed successfully',
                'fileName': file_name,
                'results': results,
                'deep_response': json.dumps(deep_response) if deep_response else None
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