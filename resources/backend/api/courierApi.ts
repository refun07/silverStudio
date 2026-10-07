// src/api/courierApi.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../order/hooks';
import { setCities, setZones, setAreas, setRedxAreas } from '../store/courierSlice';
import { PatahoZone, PathaoArea, PathaoCity, RedxArea } from '../react/types';
import { Dispatch, SetStateAction } from 'react';

function pathaoList<T>(payload: any): T[] {
  const list = payload?.data?.data?.data;
  return Array.isArray(list) ? list : [];
}

export function useCities() {
  const dispatch = useAppDispatch();
  const cities = useAppSelector((state) => state.courier.cities);

  return useQuery<PathaoCity[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      if (cities.length > 0) return cities;
      const { data } = await axios.get('/api/v1/courier/pathao/cities');
      const cityList = pathaoList<PathaoCity>(data);
      dispatch(setCities(cityList));
      return cityList;
    },
    staleTime: Infinity,

  });
}

export function useZones(cityId?: number) {
  const dispatch = useAppDispatch();
  const zones = useAppSelector((state) => state.courier.zones[cityId || 0]);
  return useQuery<PatahoZone[]>({
    queryKey: ['zones', cityId],
    queryFn: async () => {
      if (!cityId) return [];
      if (zones) return zones;

        const { data } = await axios.get(`/api/v1/courier/pathao/zones/${cityId}`);
        const zoneList = pathaoList<PatahoZone>(data);
        dispatch(setZones({ cityId, zones: zoneList }));
        return zoneList;

    },
    enabled: !!cityId,
    staleTime: Infinity,
  });
}

export function useAreas(zoneId?: number) {
  const dispatch = useAppDispatch();
  const areas = useAppSelector((state) => state.courier.areas[zoneId || 0]);

  return useQuery<PathaoArea[]>({
    queryKey: ['areas', zoneId],
    queryFn: async () => {
      if (!zoneId) return [];
      if (areas) return areas;
      const { data } = await axios.get(`/api/v1/courier/pathao/areas/${zoneId}`);
      const areaList = pathaoList<PathaoArea>(data);
      dispatch(setAreas({ zoneId, areas: areaList }));
      return areaList;
    },
    enabled: !!zoneId,
    staleTime: Infinity,
  });
}
export function useRedxAreas() {
  const dispatch = useAppDispatch();
  const redxAreas = useAppSelector((state) => state.courier.redxAreas);

  return useQuery<RedxArea[]>({
    queryKey: ['redxAreas'],
    queryFn: async () => {
      if (redxAreas.length > 0) return redxAreas;
      const { data } = await axios.get('/api/v1/courier/redx/areas');
      dispatch(setRedxAreas(data.data.areas));
      return data.data.areas;
    },
    staleTime: Infinity,

  });
}

export function useTrackCourier(setLoading:Dispatch<SetStateAction<boolean>>,trackId?: string,partner?:string) {
    console.log(trackId,partner);
  return useQuery<{}>({
    queryKey: [`${partner}-${trackId}`, trackId],
    queryFn: async () => {
      if (!trackId) return {};
        setLoading(true);
        const { data } = await axios.get(`/api/v1/courier/status?partner=${partner}&tracking_id=${trackId}`);
        setLoading(false);
        if(partner == 'pathao'){
            return data.data;
        }else if(partner == 'redx'){
            return data.data.tracking;
        }
        return data.data;
    },
    enabled: !!trackId,
    staleTime: Infinity,
  });
}
