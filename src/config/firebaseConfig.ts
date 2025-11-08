import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// Note: getReactNativePersistence는 Firebase v10+에서 다른 방식으로 처리됨
// 실제 사용 시 @react-native-firebase/auth 패키지 사용 권장

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCYB5GoVBFTfKIhW4_uHGAB1itoM8NP_sE",
  authDomain: "heart-stamp-diary.firebaseapp.com",
  projectId: "heart-stamp-diary",
  storageBucket: "heart-stamp-diary.firebasestorage.app",
  messagingSenderId: "45917671913",
  appId: "1:45917671913:web:f28cdfaa5986d4ba083b78",
  measurementId: "G-9C8VWJKQVK"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 인증 객체 (React Native에서는 @react-native-firebase/auth 사용 권장)
const auth = getAuth(app);

export { app, auth };
