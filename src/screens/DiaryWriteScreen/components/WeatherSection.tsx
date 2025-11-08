import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { WeatherType } from '../../../models/DiaryEntry';
import { WeatherService } from '../../../services/weatherService';
import { COLORS } from '../../../constants/colors';

interface WeatherSectionProps {
  weather: WeatherType | null;
  loadingWeather: boolean;
  onWeatherSelect: (weather: WeatherType) => void;
}

const weatherOptions: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];

export const WeatherSection: React.FC<WeatherSectionProps> = ({
  weather,
  loadingWeather,
  onWeatherSelect,
}) => {
  return (
    <View style={styles.weatherSection}>
      <View style={styles.weatherButtons}>
        {weatherOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.weatherButton,
              weather === option && styles.weatherButtonSelected,
            ]}
            onPress={() => onWeatherSelect(option)}
          >
            <Text style={styles.weatherEmoji}>
              {WeatherService.getWeatherEmoji(option)}
            </Text>
            <Text
              style={[
                styles.weatherText,
                weather === option && styles.weatherTextSelected,
              ]}
            >
              {WeatherService.getWeatherLabel(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loadingWeather && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color={COLORS.buttonSecondaryBackground} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  weatherSection: {
    padding: 16,
    backgroundColor: COLORS.buttonBackground,
  },
  loadingIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  weatherButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 4,
  },
  weatherButton: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    minWidth: 50,
    backgroundColor: '#fff',
    shadowColor: COLORS.buttonText,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherButtonSelected: {
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.buttonText,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 4.65,
    elevation: 8,
  },
  weatherEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  weatherText: {
    fontSize: 11,
    color: '#666',
  },
  weatherTextSelected: {
    color: '#333',
    fontWeight: '700',
  },
});
