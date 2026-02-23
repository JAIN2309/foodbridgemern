import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import MapService, { LocationData, MapRegion } from '../services/mapService';

interface MapComponentProps {
  markers?: LocationData[];
  onLocationSelect?: (location: LocationData) => void;
  showUserLocation?: boolean;
  initialRegion?: MapRegion;
}

const MapComponent: React.FC<MapComponentProps> = ({
  markers = [],
  onLocationSelect,
  showUserLocation = true,
  initialRegion
}) => {
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  );
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (showUserLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation]);

  const getCurrentLocation = async () => {
    try {
      const location = await MapService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setRegion(MapService.createRegion(location.latitude, location.longitude));
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const address = await MapService.reverseGeocode(latitude, longitude);
    
    const selectedLocation: LocationData = {
      latitude,
      longitude,
      address
    };

    onLocationSelect?.(selectedLocation);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showUserLocation}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
        
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={marker}
            title={marker.address || `Location ${index + 1}`}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapComponent;