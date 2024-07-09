import React, { useState, useRef } from 'react';
import { View, StyleSheet, Button, TouchableOpacity, Text } from 'react-native';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { ThemedText } from '@/components/ThemedText';
import * as FileSystem from 'expo-file-system';

import axios from 'axios';

export default function CameraScreen() {

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [showResponse, setShowResponde] = useState(false);
  const [toastMessage, setToastMessage] = useState('');


  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  async function translate() {
    setToastMessage("Traduciendo");
    if (cameraRef.current) {
      let photo = await cameraRef.current.takePictureAsync();
      // do api call to openai
      console.log(photo);
      sendToOpenAI(photo.uri);
    }
  }

  async function convertImageToBase64(imageUri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  };

  async function sendToOpenAI(imageUri: string) {
    const apiKey = process.env.EXPO_PUBLIC_API_KEY_OPEN_AI;
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const imageBase64 = await convertImageToBase64(imageUri);

    const body = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `
          Sos experto en leer y traducir ordenes medicas.
          Solo traduci sobre ordenes medicas.
          Responde de forma corta y consisa.
          No podes dar un diagnostico sobre la orden medica.
          Aclarar el % de precision de la traducción.
          `
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Clarificame lo que dice la receta medica?'
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    }

    try {
      const response = await axios.post(apiUrl, body, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ContentType: 'application/json',
        },
      });
      const responseMsg = response.data.choices[0].message.content;
      console.log('Respuesta de OpenAI:', responseMsg);
      setToastMessage(responseMsg);
      
    } catch (error) {
      console.log(error);
      console.error('Error al enviar la imagen a OpenAI:', error);
    }
  };

  return (
    <View style={styles.container}>
    <CameraView style={styles.camera}  ref={cameraRef}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.button} onPress={translate}>
          <Text style={styles.text}>Traducir Orden</Text>
        </TouchableOpacity>
        <View style={styles.messageContainer}>
          <ThemedText style={styles.textResponse}>{toastMessage}</ThemedText>
        </View>
      </View>
    </CameraView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Color de fondo general
  },
  camera: {
    flex: 1,
    aspectRatio: 1, // Proporción de aspecto cuadrada para la cámara
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', // Alinea los elementos en la parte inferior
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo semi-transparente para superposiciones
    paddingRight:200,
  },
  button: {
    backgroundColor: '#007AFF', // Color de fondo del botón
    padding: 12,
    borderRadius: 5,
    marginBottom: 16,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: 'white', // Fondo del contenedor de mensaje
    padding: 8,
    paddingRight:250,
    borderRadius: 5,
    marginBottom: 32, // Espacio adicional después del mensaje
  },
  textResponse: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
});