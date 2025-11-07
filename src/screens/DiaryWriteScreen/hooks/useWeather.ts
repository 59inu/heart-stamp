import { useState, useCallback } from 'react';
import { WeatherType } from '../../../models/DiaryEntry';
import { WeatherService } from '../../../services/weatherService';

interface UseWeatherReturn {
  loadingWeather: boolean;
  fetchWeather: () => Promise<void>;
}

export const useWeather = (
  setWeather: (weather: WeatherType | null) => void
): UseWeatherReturn => {
  const [loadingWeather, setLoadingWeather] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    const currentWeather = await WeatherService.getCurrentWeather();
    if (currentWeather) {
      setWeather(currentWeather);
    }
    setLoadingWeather(false);
  }, []);

  return {
    loadingWeather,
    fetchWeather,
  };
};
