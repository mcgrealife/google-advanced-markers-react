import { Wrapper } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'
import React, { useEffect, useMemo, useRef, useState } from 'react'
// install types from https://www.npmjs.com/package/@types/google.maps
import { locations } from '../../resources/locations'
import type { Location } from '../../resources/locations'
import create from 'zustand'

interface MapStore {
  selected: number | null
  setSelected: (selected: number | null) => void
  zustandMap: google.maps.Map | null
  setZustandMap: (zustandMap: google.maps.Map | null) => void
  mapBounds: google.maps.LatLngBoundsLiteral | null
  setMapBounds: (mapBounds: google.maps.LatLngBoundsLiteral) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),
  mapBounds: null,
  setMapBounds: (mapBounds) => set({ mapBounds }),
  zustandMap: null,
  setZustandMap: (zustandMap) => set({ zustandMap }),
}))

export default function BasicWithZustand() {
  const { mapBounds } = useMapStore() // the latest mapBounds without prop-drilling a listener handler!

  const locationsFiltered = useMemo(() => {
    return mapBounds
      ? filterByBounds({ locations: locations, bounds: mapBounds })
      : undefined
  }, [locations, mapBounds])

  return (
    <div>
      <Wrapper
        apiKey={'AIzaSyCjoPYJRx3eJvqVmmS6d6LzAo-BScYcraI'}
        libraries={['marker']} // required for advanced markers
        version='beta' // required for advanced markers (currently)
      >
        <Map
          mapId='e1d3e46e2d29280' // required for advanced markers
          center={{ lat: 41.864817, lng: -87.624577 }}
          zoom={13}
          gestureHandling='greedy'
          style={{ flexGrow: '1', height: '100vh', width: '100%' }}>
          {locationsFiltered?.map((l) => (
            <Marker key={l.id} location={l} />
          ))}
        </Map>
      </Wrapper>
    </div>
  )
}

interface MapProps extends google.maps.MapOptions {
  style: { [key: string]: string }
  children?: React.ReactNode // missing from documentation
}

const Map = ({ style, children, ...options }: MapProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const { setMapBounds, zustandMap, setZustandMap } = useMapStore()

  useEffect(() => {
    if (ref.current && !zustandMap)
      setZustandMap(new window.google.maps.Map(ref.current, options)) // pass options!
  }, [ref, zustandMap])

  useDeepCompareEffectForMaps(() => {
    if (zustandMap) zustandMap.setOptions(options)
  }, [zustandMap, options])

  useEffect(() => {
    if (zustandMap) {
      // can add listeners for any other event type, see https://developers.google.com/maps/documentation/javascript/events
      ;['idle'].forEach((eventName) =>
        google.maps.event.clearListeners(zustandMap, eventName)
      )

      zustandMap.addListener('idle', () => {
        const bounds = zustandMap.getBounds()?.toJSON()
        bounds && setMapBounds(bounds)
      })
    }
  }, [zustandMap])

  return (
    <>
      <div id='map' ref={ref} style={style}>
        {React.Children.map(
          children,
          (child) => React.isValidElement(child) && React.cloneElement(child)
        )}
      </div>
    </>
  )
}

interface MarkerProps {
  location: Location
}

const Marker = ({ location }: MarkerProps) => {
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerView>() // easier to let the marker manage it's own isolated state here. // using zustand for markers and setMarkers (plural) is useful though (but would require filtering to find the marker)
  const advancedMarkerRef = useRef<HTMLDivElement>(null)

  const { selected, setSelected, zustandMap } = useMapStore()

  useEffect(() => {
    if (zustandMap && !marker && !!advancedMarkerRef.current) {
      setMarker(
        new window.google.maps.marker.AdvancedMarkerView({
          position: {
            lat: location.latitude,
            lng: location.longitude,
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
      setSelected(location.id)
      marker.zIndex = 2
    })
  }, [marker])

  // zIndex cannot be set on the marker, so we react to selected changes and set there
  useEffect(() => {
    if (selected !== location.id && marker) {
      marker.zIndex = 1
    }
  }, [selected])

  // google docs examples say to return null, because google maps manages the DOM
  // but the AdvancedMarker.content prop requires attributes of Element – which only exist after being mounted – i.e. requires a ref
  // so here, we return a div with a ref

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
          backgroundColor: selected == location.id ? '#366CA5' : 'white',
          borderRadius: '4px',
          filter:
            'drop-shadow(0px 2px 6px rgba(60,64,67,.15)) drop-shadow(0px 1px 2px rgba(60,64,67,.3))',
          color: selected == location.id ? 'white' : '#3C4043',
          fontSize: '12px',
          display: 'grid',
          placeItems: 'center',
          padding: '2px 6px 2px 6px',
          // zIndex: 2 // does not work! after google moves this ref element, it will manage the Index on the advandcedMarkerView // you can modify it in a useEffect
        }}>
        {location.id}
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

export const filterByBounds = ({
  locations,
  bounds,
}: {
  locations: Location[]
  bounds: google.maps.LatLngBoundsLiteral
}): Location[] =>
  locations.filter(
    (l) =>
      l.longitude >= bounds.west &&
      l.longitude <= bounds.east &&
      l.latitude >= bounds.south &&
      l.latitude <= bounds.north
  )
