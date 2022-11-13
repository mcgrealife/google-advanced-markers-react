import { Wrapper } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'
import React, { useEffect, useRef, useState } from 'react'
// install types from https://www.npmjs.com/package/@types/google.maps
import { locations } from '../../resources/locations'
import type { Location } from '../../resources/locations'
import Supercluster, { PointFeature, ClusterFeature } from 'supercluster'
// install types from @types/supercluster -D

import create from 'zustand'

interface MapStore {
  selected: number | null
  setSelected: (selected: number | null) => void
  zustandMap: google.maps.Map | null
  setZustandMap: (zustandMap: google.maps.Map | null) => void
  mapBounds: google.maps.LatLngBoundsLiteral | null
  setMapBounds: (mapBounds: google.maps.LatLngBoundsLiteral) => void
  mapZoom: number | null
  setMapZoom: (mapZoom: number | null) => void
  mapCenter: google.maps.LatLngLiteral | null
  setMapCenter: (mapCenter: google.maps.LatLngLiteral | null) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),
  zustandMap: null,
  setZustandMap: (zustandMap) => set({ zustandMap }),
  mapBounds: null,
  setMapBounds: (mapBounds) => set({ mapBounds }),
  mapZoom: 13,
  setMapZoom: (mapZoom) => set({ mapZoom }),
  mapCenter: { lat: 41.864817, lng: -87.624577 },
  setMapCenter: (mapCenter) => set({ mapCenter }),
}))

export default function ZustandWithClusters() {
  const { mapBounds, mapZoom, mapCenter } = useMapStore() // the latest mapBounds without prop-drilling a listener handler!

  const [locationsManagedBySuperCluster, setLocationsManagedBySuperCluster] =
    useState<FeaturePoint[]>()

  useEffect(() => {
    if (!location || !mapBounds || !mapZoom || !mapCenter) return
    setLocationsManagedBySuperCluster(
      calculateSuperCluster({
        locations: locations,
        bounds: mapBounds,
        zoom: mapZoom,
      })
    )
  }, [mapBounds, mapZoom, mapCenter])

  return (
    <div>
      refresh
      <Wrapper
        apiKey={'AIzaSyCjoPYJRx3eJvqVmmS6d6LzAo-BScYcraI'}
        libraries={['marker']} // required for advanced markers
        version='beta' // required for advanced markers (currently)
      >
        <Map
          mapId='e1d3e46e2d29280' // required for advanced markers
          center={mapCenter}
          zoom={mapZoom}
          gestureHandling='greedy'
          style={{ flexGrow: '1', height: '100vh', width: '100%' }}>
          {locationsManagedBySuperCluster?.map((l) => (
            <Marker key={l.id} featurePoint={l} />
          ))}
        </Map>
      </Wrapper>
    </div>
  )
}

interface MapProps extends google.maps.MapOptions {
  style: { [key: string]: string }
  // onMapClick?: (e: google.maps.MapMouseEvent) => void
  // onMapIdle?: (zustandMap: google.maps.Map) => void
  children?: React.ReactNode // missing from documentation
}

const Map = ({ style, children, ...options }: MapProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const { setMapBounds, zustandMap, setZustandMap, setMapZoom, setMapCenter } =
    useMapStore()

  useEffect(() => {
    if (ref.current && !zustandMap) {
      setZustandMap(new window.google.maps.Map(ref.current, options)) // pass options!
    }
  }, [ref, zustandMap])

  useDeepCompareEffectForMaps(() => {
    if (zustandMap) {
      zustandMap.setOptions(options)
    }
  }, [zustandMap, options])

  useEffect(() => {
    if (zustandMap) {
      // can add listeners for any other event type, see https://developers.google.com/maps/documentation/javascript/events
      ;['idle'].forEach((eventName) =>
        google.maps.event.clearListeners(zustandMap, eventName)
      )

      zustandMap.addListener('idle', () => {
        const bounds = zustandMap.getBounds()?.toJSON()
        const zoom = zustandMap.getZoom()
        const center = zustandMap.getCenter()?.toJSON()
        bounds && setMapBounds(bounds)
        zoom && setMapZoom(zoom)
        center && setMapCenter(center)
      })
    }
  }, [zustandMap])

  return (
    <>
      <div id='map' ref={ref} style={style}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child) // simpler when using zustandMap!
          }
        })}
      </div>
    </>
  )
}

interface MarkerProps {
  featurePoint: FeaturePoint
}

const Marker = ({ featurePoint }: MarkerProps) => {
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerView>() // easier to let the marker manage it's own isolated state here. // using zustand for markers and setMarkers (plural) is useful though (but would require filtering to find the marker)
  const advancedMarkerRef = useRef<HTMLDivElement>(null)
  // const [map, setMap] = useState<google.maps.Map>()

  const { selected, setSelected, zustandMap } = useMapStore()

  useEffect(() => {
    if (zustandMap && !marker && !!advancedMarkerRef.current) {
      setMarker(
        new window.google.maps.marker.AdvancedMarkerView({
          position: {
            lat: featurePoint.properties.locationObject.latitude,
            lng: featurePoint.properties.locationObject.longitude,
          },
          map: zustandMap,
          content: advancedMarkerRef.current,
          zIndex: 1,
        })
      )
    }
    return () => {
      // google maps and react do not coordinate unmounting the marker. when locations changes, react will remove the stable div that originally wrapped the marker ref; however, at this point, google will have moved the div ref to another part of the DOM that it manages. So tell google to unmount the marker by setting the marker's map property to null. This can be done anywhere, anytime, but the useEffect return function runs when react is unmounting the stable div (exactly the type of case it was designed for!)
      if (marker) {
        marker.map = null
      }
    }
  }, [marker, advancedMarkerRef, zustandMap])

  useEffect(() => {
    marker?.addListener('click', (e: google.maps.MapMouseEvent) => {
      setSelected(featurePoint.properties.locationObject.id)
      marker.zIndex = 2
    })
  }, [marker])

  // zIndex cannot be set on the marker, so we react to selected changes and set there
  useEffect(() => {
    if (selected !== featurePoint.properties.locationObject.id && marker) {
      marker.zIndex = 1
    }
  }, [selected])

  // google docs examples say to return null, because google maps manages the DOM
  // but the AdvancedMarker.content prop requires attributes of Element – which only exist after being mounted – i.e. requires a ref
  // so here, we return a div with a ref

  const useClusterStyle = featurePoint.properties.zoom <= 14
  return (
    // once mounted, google will move the ref div to a different part of the dom (it will nest it inside a 'marker-view' div). So when react tries to unmount the advancedMarkerRef div, it will be gone! The simple solution is to wrap the advancedMarkerRef div in another stable element, such as a div, that google will not move
    <div id='stable'>
      <div
        onClick={() => {
          // this does nothing! After google takes this ref and moved it to the zustandMap element, it will wrap it in a div that blocks this click target. Instead, add a listener to the marker after it mounts (in a useEffect)
          // onMouseEnter={} and onMouseLeave={} do work though!
        }}
        // id={location.id.toString()}
        ref={advancedMarkerRef}
        id='googleManagedMarker'
        style={{
          backgroundColor: useClusterStyle
            ? '#0369a1'
            : selected == featurePoint.properties.locationObject.id
            ? '#366CA5'
            : 'white',
          borderRadius: useClusterStyle ? '100%' : '4px',
          filter: useClusterStyle
            ? 'none'
            : 'drop-shadow(0px 2px 6px rgba(60,64,67,.15)) drop-shadow(0px 1px 2px rgba(60,64,67,.3))',
          border: useClusterStyle ? '2px solid ##cffafe' : 'none',
          color: useClusterStyle
            ? 'white'
            : selected == featurePoint.properties.locationObject.id
            ? 'white'
            : '#3C4043',
          fontWeight: useClusterStyle ? 'bold' : 'normal',
          fontSize: '12px',
          display: 'grid',
          placeItems: 'center',
          padding: useClusterStyle ? '10px' : '2px 6px 2px 6px',
        }}>
        {featurePoint.properties.sum}
      </div>
    </div>
  )
}

// google-recommended helper functions below

function useDeepCompareEffectForMaps(
  callback: React.EffectCallback,
  dependencies: any[]
) {
  useEffect(callback, dependencies.map(useDeepCompareMemoize))
}

function useDeepCompareMemoize(value: any) {
  const ref = useRef()

  if (!deepCompareEqualsForMaps(value, ref.current)) {
    ref.current = value
  }

  return ref.current
}

const deepCompareEqualsForMaps = createCustomEqual(
  // @ts-ignore
  (deepEqual) => (a: any, b: any) => {
    if (
      isLatLngLiteral(a) ||
      a instanceof google.maps.LatLng ||
      isLatLngLiteral(b) ||
      b instanceof google.maps.LatLng
    ) {
      return new google.maps.LatLng(a).equals(new google.maps.LatLng(b))
    }

    // use fast-equals for other objects
    // @ts-ignore
    return deepEqual(a, b)
  }
)

// superCluster library (which is what google marker-cluster uses)
interface ClusterPointsProps {
  locationObject: Location
  cluster?: boolean
  point_count?: number
  sum: number
  zoom: number
}

type FeaturePoint =
  | ClusterFeature<ClusterPointsProps>
  | PointFeature<ClusterPointsProps>

const calculateSuperCluster = ({
  locations,
  zoom,
  bounds,
}: {
  locations: Location[]
  zoom: number
  bounds: google.maps.LatLngBoundsLiteral
}): FeaturePoint[] => {
  console.log('calcualting supercluster')
  const points = locations?.map((l) => ({
    // superCluster strangely requires coordinates reversed https://stackoverflow.com/questions/68514407/supercluster-returning-unexpected-longitude-values & https://github.com/mapbox/supercluster/issues/52
    // also note: this supercluster library does not work if google maps fractionalZoom is enabled
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [l.longitude, l.latitude], // lat is lng, supercluster quirk
    },
    id: l.id,
    lat: l.longitude, // lat is lng, supercluster quirk
    lng: l.latitude, // lat is lng, supercluster quirk
    properties: {
      locationObject: l,
      anything: 'we can store anything here!',
      sum: l.id,
      zoom: zoom,
    },
  }))

  const index = new Supercluster<ClusterPointsProps, ClusterPointsProps>({
    radius: 220,
    maxZoom: 14,
    minPoints: 0,
    map: (props): ClusterPointsProps => ({
      sum: props.sum,
      locationObject: props.locationObject,
      zoom: props.zoom, // this can be useful for filtering markers against zoom levels
    }),
    reduce: (accumulated, props): void => {
      accumulated.sum += props.sum
    },
  })
  index.load(points)
  console.log(
    'settinglocationsAftersuper IN GETCLUSTER',
    locations.length,
    zoom,
    bounds,
    index.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      zoom
    )
  )
  return index.getClusters(
    [bounds.west, bounds.south, bounds.east, bounds.north],
    zoom
  )
}
