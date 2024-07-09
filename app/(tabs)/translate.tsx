import React, { useState, useRef } from 'react';
import { View, StyleSheet, Button, TouchableOpacity, Text } from 'react-native';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { ThemedText } from '@/components/ThemedText';
import * as FileSystem from 'expo-file-system';

import axios from 'axios';

export default function CameraScreen() {

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [showToast, setShowToast] = useState(false);
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

  // TODO: Unify toast logic
  async function translate() {
    setToastMessage("Traduciendo");
    setShowToast(true);
    if (cameraRef.current) {
      let photo = await cameraRef.current.takePictureAsync();

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
      setShowToast(true);

    } catch (error) {
      console.log(error);
      console.error('Error al enviar la imagen a OpenAI:', error);
      setToastMessage("Error al traducir foto");
      setShowToast(true);
    }
  };

  function resetToastMessage(){
    setShowToast(false);
    setToastMessage('');
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {showToast &&
            <View style={styles.messageContainer}>
              <ThemedText style={styles.textResponse}>{toastMessage}</ThemedText>
            </View>
          }
          <View style={styles.buttonContainer} >
          <TouchableOpacity style={styles.button} onPress={translate}>
            <Text style={styles.text}>Traducir Orden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={resetToastMessage}>
            <Text style={styles.text}>Limpiar</Text>
          </TouchableOpacity>
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
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', // Alinea los elementos en la parte inferior
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo semi-transparente para superposiciones
    padding: 10,
  },
  button: {
    backgroundColor: '#007AFF', // Color de fondo del botón
    padding: 10,
    borderRadius: 45,
    margin: 16,
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
    borderRadius: 10,
    marginBottom: 10, // Espacio adicional después del mensaje
  },
  textResponse: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
  buttonContainer:{
    flexDirection:'row',
    padding:5,
  }
});
