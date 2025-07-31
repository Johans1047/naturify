import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # Initialize client
    dynamodb = boto3.resource('dynamodb')
    
    try:
        table = dynamodb.Table('rekognitionImagesTable')
        
        # scan(), get all the items in the response if there is no filter
        response = table.scan()
        
        items = response['Items']
        
        # Scan all pages
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
    
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'success': True,
                'count': len(items),
                'items': items
            }, default=str)
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': f"DynamoDB Error [{error_code}]: {error_message}"
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': f"Internal error: {str(e)}"
            })
        }