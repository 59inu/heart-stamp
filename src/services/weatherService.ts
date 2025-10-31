import * as Location from 'expo-location';
import axios from 'axios';
import { WeatherType } from '../models/DiaryEntry';

// OpenWeatherMap API (무료 플랜: 1,000 calls/day)
// 가입 후 API 키를 받으세요: https://openweathermap.org/api
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || 'demo';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export class WeatherService {
  /**
   * 현재 위치의 날씨를 가져옵니다
   */
  static async getCurrentWeather(): Promise<WeatherType | null> {
    try {
      // 1. 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('위치 권한이 거부되었습니다.');
        return null;
      }

      // 2. 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // 3. OpenWeatherMap API 호출
      if (OPENWEATHER_API_KEY === 'demo') {
        console.log('⚠️ OPENWEATHER_API_KEY가 설정되지 않았습니다. 데모 모드로 랜덤 날씨를 반환합니다.');
        return this.getRandomWeather();
      }

      const response = await axios.get(OPENWEATHER_BASE_URL, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: OPENWEATHER_API_KEY,
        },
      });

      // 4. API 응답을 WeatherType으로 변환
      const weatherCode = response.data.weather[0].id;
      return this.mapWeatherCodeToType(weatherCode);
    } catch (error) {
      console.error('날씨 정보를 가져오는데 실패했습니다:', error);
      return null;
    }
  }

  /**
   * OpenWeatherMap 날씨 코드를 앱의 WeatherType으로 매핑
   * https://openweathermap.org/weather-conditions
   */
  private static mapWeatherCodeToType(code: number): WeatherType {
    if (code >= 200 && code < 300) {
      return 'stormy'; // 천둥번개
    } else if (code >= 300 && code < 600) {
      return 'rainy'; // 비 (이슬비, 비)
    } else if (code >= 600 && code < 700) {
      return 'snowy'; // 눈
    } else if (code >= 801 && code <= 804) {
      return 'cloudy'; // 흐림
    } else if (code === 800) {
      return 'sunny'; // 맑음
    } else {
      return 'cloudy'; // 기타 (안개, 연기 등)
    }
  }

  /**
   * 데모 모드용: 랜덤 날씨 반환
   */
  private static getRandomWeather(): WeatherType {
    const weathers: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];
    return weathers[Math.floor(Math.random() * weathers.length)];
  }

  /**
   * WeatherType을 이모지로 변환
   */
  static getWeatherEmoji(weather: WeatherType): string {
    switch (weather) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'snowy':
        return '❄️';
      case 'stormy':
        return '⛈️';
      default:
        return '☁️';
    }
  }

  /**
   * WeatherType을 한글 텍스트로 변환
   */
  static getWeatherLabel(weather: WeatherType): string {
    switch (weather) {
      case 'sunny':
        return '맑음';
      case 'cloudy':
        return '흐림';
      case 'rainy':
        return '비';
      case 'snowy':
        return '눈';
      case 'stormy':
        return '폭우';
      default:
        return '흐림';
    }
  }
}
