# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
"""
Shows how to use the Converse API with DeepSeek-R1 (on demand).
"""

import logging
import boto3

from botocore.client import Config
from botocore.exceptions import ClientError


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def invoke_deepseek_model(image_data, labels):
    # Create a Bedrock Runtime client in the AWS Region of your choice.
    bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-2")

    # ARN DeepSeek model
    model_id = "us.deepseek.r1-v1:0"
    
    # Setup the system prompts and messages to send to the model.
    system_prompt = [{"text": "Eres una aplicacion que recibe etiquetas referentes a imagenes de paisajes naturales y en base a ellas generas una descripcion de la imagen de entre 7 y 12 palabras"}]

    message = [{
        "role": "user",
        "content": [{"text": f"Analiza esta imagen que contiene las siguientes etiquetas detectadas: {', '.join(labels)} and this: {image_data}. Proporciona una descripción detallada."}]
    }]

    # Base inference parameters to use.
    inference_config = {
        "maxTokens": 256,
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

def main():
    """
    Entrypoint for DeepSeek-R1 example.
    """

    logging.basicConfig(level=logging.INFO,
                        format="%(levelname)s: %(message)s")

    model_id = "us.deepseek.r1-v1:0"

    # Setup the system prompts and messages to send to the model.
    system_prompts = [{"text": "You are an app that creates playlists for a radio station that plays rock and pop music. Only return song names and the artist."}]
    message_1 = {
        "role": "user",
        "content": [{"text": "Create a list of 3 pop songs."}]
    }
    message_2 = {
        "role": "user",
        "content": [{"text": "Make sure the songs are by artists from the United Kingdom."}]
    }
    messages = []

    try:
        # Configure timeout for long responses if needed
        custom_config = Config(connect_timeout=840, read_timeout=840)
        bedrock_client = boto3.client(service_name='bedrock-runtime', config=custom_config)

        # Start the conversation with the 1st message.
        messages.append(message_1)
        response = generate_conversation(
            bedrock_client, model_id, system_prompts, messages)

        # Add the response message to the conversation.
        output_message = response['output']['message']['content']['text']
        
        # Remove reasoning content from the response
        output_contents = []
        for content in output_message["content"]:
            if content.get("reasoningContent"):
                continue
            else:
                output_contents.append(content)
        output_message["content"] = output_contents
        
        messages.append(output_message)

        # Continue the conversation with the 2nd message.
        messages.append(message_2)
        response = generate_conversation(
            bedrock_client, model_id, system_prompts, messages)

        output_message = response['output']['message']
        messages.append(output_message)

        # Show the complete conversation.
        for message in messages:
            print(f"Role: {message['role']}")
            for content in message['content']:
                if content.get("text"):
                    print(f"Text: {content['text']}")
                if content.get("reasoningContent"):
                    reasoning_content = content['reasoningContent']
                    reasoning_text = reasoning_content.get('reasoningText', {})
                    print()
                    print(f"Reasoning Text: {reasoning_text.get('text')}")
            print()

    except ClientError as err:
        message = err.response['Error']['Message']
        logger.error("A client error occurred: %s", message)
        print(f"A client error occured: {message}")

    else:
        print(
            f"Finished generating text with model {model_id}.")


if __name__ == "__main__":
    main()
    
    
import cv2
import numpy as np

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
    
    return enhanced