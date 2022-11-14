// install types from https://www.npmjs.com/package/@types/google.maps
import { Wrapper } from '@googlemaps/react-wrapper'
import React, { useEffect, useRef, useState } from 'react'
import { useDeepCompareEffectForMaps } from '../../useDeepCompareEffect'
import { Location, locations } from '../../resources/locations'

export default function Basic() {
  const [map, setMap] = useState<google.maps.Map>()
  const onMapClick = () => {
    console.log('map onClick')
  }
  const onMapIdle = () => {
    console.log('map onIdle')
  }

  return (
    <div>
      <Wrapper
        apiKey={'AIzaSyCjoPYJRx3eJvqVmmS6d6LzAo-BScYcraI'}
        libraries={['marker']}
        version='beta'>
        <Map
          mapId='e1d3e46e2d29280' // required for advanced markers!
          center={{ lat: 41.864817, lng: -87.624577 }}
          zoom={13}
          onMapClick={onMapClick}
          onMapIdle={onMapIdle}
          map={map}
          setMap={setMap}
          gestureHandling='greedy'
          style={{ flexGrow: '1', height: '100vh', width: '100vw' }}>
          {locations.map((location, index) => (
            <Marker key={index} map={map} location={location} />
          ))}
        </Map>
      </Wrapper>
    </div>
  )
}

interface MapProps extends google.maps.MapOptions {
  style: { [key: string]: string }
  onMapClick?: (e: google.maps.MapMouseEvent) => void
  onMapIdle?: (map: google.maps.Map) => void
  children?: React.ReactNode // missing from documentation
  map: google.maps.Map | undefined
  setMap: React.Dispatch<React.SetStateAction<google.maps.Map | undefined>>
}

const Map = ({
  onMapClick,
  onMapIdle,
  map,
  setMap,
  style,
  children,
  ...options
}: MapProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, options)) // must pass options
    }
  }, [ref, map])

  useDeepCompareEffectForMaps(() => {
    if (map) {
      map.setOptions(options)
    }
  }, [map, options])

  useEffect(() => {
    // add callbacks to listeners. Event types: https://developers.google.com/maps/documentation/javascript/events
    if (map) {
      ;['click', 'idle'].forEach((eventName) =>
        google.maps.event.clearListeners(map, eventName)
      )

      if (onMapClick) {
        map.addListener('click', onMapClick)
      }

      if (onMapIdle) {
        map.addListener('idle', () => onMapIdle(map))
      }
    }
  }, [map, onMapClick, onMapIdle])

  return (
    <>
      <div id='map' ref={ref} style={style}>
        {children}
      </div>
    </>
  )
}

interface MarkerProps {
  location: Location
  map: google.maps.Map | undefined
}

const Marker = ({ location, map }: MarkerProps) => {
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerView>() // not google.maps.Marker
  const advancedMarkerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (map && !marker && !!advancedMarkerRef.current) {
      setMarker(
        new window.google.maps.marker.AdvancedMarkerView({
          position: {
            lat: location.latitude,
            lng: location.longitude,
          },
          map,
          content: advancedMarkerRef.current,
          collisionBehavior:
            google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY,
        })
      )
    }
    return () => {
      if (marker) {
        marker.map = null
      }
    }
  }, [marker, advancedMarkerRef, map])

  useEffect(() => {
    marker?.addListener('click', () => {
      console.log('advancedMarker click')
    })
  }, [marker])

  // google docs examples say to return null, because google maps manages the DOM
  // but the AdvancedMarker.content prop requires attributes of Element – which only exist after being mounted – i.e. requires a ref
  // we could create this div anwhere, but this component is convenient because we already have location props and other useful information
  // so here, we return a div with a ref

  return (
    // However! Once mounted, google will move the advancedMarkerRef div to a different part of the dom (and wrap it in its own div with a className that includes 'marker-view'). So when react tries to unmount the div with advancedMarkerRef, it will be gone! You'll see an error "cannot remove child (i.e. the advancedMarkerRef div). Child belongs to parent in different part of the DOM (i.e. google moved it to be nested in a div with className 'marker-view' elsewhere in the DOM". A simple solution to this is to wrap the div with advancedMarkerRef in something stable, like an empty div. Google is not looking at the children of this Marker component; google only knows what we tell it – which is the DOM location of the div with advancedMarkerRef. It can only move elements from that ref down. So by wrapping  the advancedMarkerRef div in another div, the wrapper div becomes stable. When react tries to unmount the <Marker /> component, the stable div will still be there.
    <div id={`stable-${location.id}`}>
      <div
        id={`google will move this-${location.id}`}
        ref={advancedMarkerRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          filter:
            'drop-shadow(0px 2px 6px rgba(60,64,67,.15)) drop-shadow(0px 1px 2px rgba(60,64,67,.3))',
          color: '#3C4043',
          fontSize: '12px',
          display: 'grid',
          placeItems: 'center',
          padding: '4px',
        }}>
        Anything!
      </div>
    </div>
  )
}
