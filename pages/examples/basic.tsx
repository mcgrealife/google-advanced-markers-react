import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'
import React, { useEffect, useRef, useState } from 'react'
// install types from https://www.npmjs.com/package/@types/google.maps

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
        version='beta'
        render={render}>
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
          {locations.map((t, index) => (
            <Marker
              key={index}
              map={map}
              advancedMarkerViewOptions={{
                position: {
                  lat: t.latitude,
                  lng: t.longitude,
                },
              }}
            />
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
    // add listeners and callbacks
    // can add listeners for any other event type, see https://developers.google.com/maps/documentation/javascript/events
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
  advancedMarkerViewOptions: google.maps.marker.AdvancedMarkerViewOptions
  map: google.maps.Map | undefined
}

const Marker = ({ advancedMarkerViewOptions, map }: MarkerProps) => {
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerView>() // not google.maps.Marker
  const advancedMarkerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (map && !marker && !!advancedMarkerRef.current) {
      setMarker(
        new window.google.maps.marker.AdvancedMarkerView({
          ...advancedMarkerViewOptions,
          map,
          content: advancedMarkerRef.current,
          collisionBehavior:
            google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY,
          // zIndex: 10, //
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
  // so here, we return a div with a ref

  return (
    // once mounted, google will move the ref div to a different part of the dom. When react tries to unmount the div, it will be gone! So it's crucial to wrap the ref div in another stable element, such as a div.
    <div>
      <div
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

const render = (status: Status) => {
  return <h1>{status}</h1>
}

type Location = {
  longitude: number
  latitude: number
}

export const locations: Location[] = [
  {
    longitude: -87.638058,
    latitude: 41.887782,
  },
  {
    longitude: -87.637174,
    latitude: 41.887971,
  },
  {
    longitude: -87.647449,
    latitude: 41.888688,
  },
  {
    longitude: -87.633458,
    latitude: 41.888743,
  },
  {
    longitude: -87.642182,
    latitude: 41.888828,
  },
  {
    longitude: -87.634875,
    latitude: 41.889785,
  },
  {
    longitude: -87.63071,
    latitude: 41.889794,
  },
  {
    longitude: -87.6381,
    latitude: 41.890125,
  },
  {
    longitude: -87.636482,
    latitude: 41.890596,
  },
  {
    longitude: -87.636076,
    latitude: 41.890605,
  },
  {
    longitude: -87.634216,
    latitude: 41.890931,
  },
  {
    longitude: -87.63523,
    latitude: 41.891015,
  },
  {
    longitude: -87.640225,
    latitude: 41.891136,
  },
  {
    longitude: -87.627599,
    latitude: 41.891197,
  },
  {
    longitude: -87.638238,
    latitude: 41.891675,
  },
  {
    longitude: -87.628546,
    latitude: 41.892071,
  },
  {
    longitude: -87.639745,
    latitude: 41.892076,
  },
  {
    longitude: -87.637271,
    latitude: 41.892289,
  },
  {
    longitude: -87.633801,
    latitude: 41.8936,
  },
  {
    longitude: -87.634427,
    latitude: 41.893731,
  },
  {
    longitude: -87.634289,
    latitude: 41.894136,
  },
  {
    longitude: -87.640695,
    latitude: 41.894556,
  },
  {
    longitude: -87.633379,
    latitude: 41.894564,
  },
  {
    longitude: -87.630701,
    latitude: 41.894614,
  },
  {
    longitude: -87.633348,
    latitude: 41.894951,
  },
  {
    longitude: -87.628595,
    latitude: 41.895294,
  },
  {
    longitude: -87.633294,
    latitude: 41.895753,
  },
  {
    longitude: -87.640183,
    latitude: 41.895814,
  },
  {
    longitude: -87.62882,
    latitude: 41.895951,
  },
  {
    longitude: -87.630072,
    latitude: 41.896423,
  },
  {
    longitude: -87.631607,
    latitude: 41.896779,
  },
  {
    longitude: -87.632371,
    latitude: 41.896912,
  },
  {
    longitude: -87.634555,
    latitude: 41.897065,
  },
  {
    longitude: -87.647512,
    latitude: 41.876816,
  },
  {
    longitude: -87.657879,
    latitude: 41.877624,
  },
  {
    longitude: -87.649239,
    latitude: 41.877626,
  },
  {
    longitude: -87.642959,
    latitude: 41.877713,
  },
  {
    longitude: -87.64669,
    latitude: 41.878189,
  },
  {
    longitude: -87.646622,
    latitude: 41.879098,
  },
  {
    longitude: -87.649466,
    latitude: 41.879131,
  },
  {
    longitude: -87.643907,
    latitude: 41.879712,
  },
  {
    longitude: -87.653142,
    latitude: 41.880537,
  },
  {
    longitude: -87.64165,
    latitude: 41.881603,
  },
  {
    longitude: -87.648377,
    latitude: 41.881633,
  },
  {
    longitude: -87.644999,
    latitude: 41.881657,
  },
  {
    longitude: -87.654702,
    latitude: 41.881692,
  },
  {
    longitude: -87.656861,
    latitude: 41.881865,
  },
  {
    longitude: -87.65815,
    latitude: 41.882096,
  },
  {
    longitude: -87.654715,
    latitude: 41.882315,
  },
  {
    longitude: -87.651188,
    latitude: 41.882764,
  },
  {
    longitude: -87.65064,
    latitude: 41.883237,
  },
  {
    longitude: -87.659636,
    latitude: 41.883826,
  },
  {
    longitude: -87.649189,
    latitude: 41.884057,
  },
  {
    longitude: -87.660906,
    latitude: 41.885159,
  },
  {
    longitude: -87.646792,
    latitude: 41.885255,
  },
  {
    longitude: -87.643217,
    latitude: 41.885412,
  },
  {
    longitude: -87.650318,
    latitude: 41.885948,
  },
  {
    longitude: -87.651821,
    latitude: 41.886501,
  },
  {
    longitude: -87.645644,
    latitude: 41.887326,
  },
  {
    longitude: -87.640317,
    latitude: 41.887399,
  },
  {
    longitude: -87.643989,
    latitude: 41.888375,
  },
  {
    longitude: -87.634127,
    latitude: 41.877056,
  },
  {
    longitude: -87.626494,
    latitude: 41.879717,
  },
  {
    longitude: -87.631796,
    latitude: 41.881152,
  },
  {
    longitude: -87.634233,
    latitude: 41.882965,
  },
  {
    longitude: -87.634625,
    latitude: 41.885378,
  },
  {
    longitude: -87.63423,
    latitude: 41.885979,
  },
  {
    longitude: -87.615341,
    latitude: 41.885579,
  },
  {
    longitude: -87.616506,
    latitude: 41.886789,
  },
  {
    longitude: -87.615605,
    latitude: 41.887093,
  },
  {
    longitude: -87.618636,
    latitude: 41.887227,
  },
  {
    longitude: -87.619005,
    latitude: 41.887322,
  },
  {
    longitude: -87.621209,
    latitude: 41.887419,
  },
  {
    longitude: -87.649158,
    latitude: 41.891421,
  },
  {
    longitude: -87.653718,
    latitude: 41.894991,
  },
  {
    longitude: -87.652796,
    latitude: 41.895072,
  },
  {
    longitude: -87.655252,
    latitude: 41.895181,
  },
  {
    longitude: -87.650467,
    latitude: 41.89525,
  },
  {
    longitude: -87.651002,
    latitude: 41.895574,
  },
  {
    longitude: -87.656806,
    latitude: 41.896869,
  },
  {
    longitude: -87.635021,
    latitude: 41.902333,
  },
  {
    longitude: -87.634802,
    latitude: 41.903191,
  },
  {
    longitude: -87.634802,
    latitude: 41.903191,
  },
  {
    longitude: -87.644268,
    latitude: 41.903472,
  },
  {
    longitude: -87.636573,
    latitude: 41.90367,
  },
  {
    longitude: -87.634699,
    latitude: 41.904794,
  },
  {
    longitude: -87.634084,
    latitude: 41.905417,
  },
  {
    longitude: -87.634126,
    latitude: 41.906589,
  },
  {
    longitude: -87.634927,
    latitude: 41.907146,
  },
  {
    longitude: -87.637739,
    latitude: 41.907461,
  },
  {
    longitude: -87.648343,
    latitude: 41.907784,
  },
  {
    longitude: -87.6498,
    latitude: 41.908396,
  },
  {
    longitude: -87.634305,
    latitude: 41.908711,
  },
  {
    longitude: -87.650818,
    latitude: 41.909078,
  },
  {
    longitude: -87.644837,
    latitude: 41.910588,
  },
  {
    longitude: -87.618118,
    latitude: 41.889243,
  },
  {
    longitude: -87.61762,
    latitude: 41.889662,
  },
  {
    longitude: -87.616309,
    latitude: 41.890713,
  },
  {
    longitude: -87.619476,
    latitude: 41.890794,
  },
  {
    longitude: -87.615326,
    latitude: 41.891205,
  },
  {
    longitude: -87.622595,
    latitude: 41.891287,
  },
  {
    longitude: -87.617237,
    latitude: 41.891968,
  },
  {
    longitude: -87.618955,
    latitude: 41.892234,
  },
  {
    longitude: -87.618206,
    latitude: 41.892261,
  },
  {
    longitude: -87.616143,
    latitude: 41.892277,
  },
  {
    longitude: -87.616528,
    latitude: 41.89292,
  },
  {
    longitude: -87.618685,
    latitude: 41.893187,
  },
  {
    longitude: -87.616078,
    latitude: 41.893729,
  },
  {
    longitude: -87.627776,
    latitude: 41.895069,
  },
  {
    longitude: -87.626466,
    latitude: 41.896508,
  },
  {
    longitude: -87.618556,
    latitude: 41.898153,
  },
  {
    longitude: -87.626706,
    latitude: 41.87837,
  },
  {
    longitude: -87.633464,
    latitude: 41.879802,
  },
  {
    longitude: -87.628566,
    latitude: 41.884634,
  },
  {
    longitude: -87.633609,
    latitude: 41.884837,
  },
  {
    longitude: -87.624131,
    latitude: 41.884991,
  },
  {
    longitude: -87.632143,
    latitude: 41.885373,
  },
  {
    longitude: -87.625451,
    latitude: 41.885445,
  },
  {
    longitude: -87.625537,
    latitude: 41.885516,
  },
  {
    longitude: -87.624991,
    latitude: 41.886105,
  },
  {
    longitude: -87.631567,
    latitude: 41.886542,
  },
  {
    longitude: -87.625872,
    latitude: 41.896284,
  },
  {
    longitude: -87.631582,
    latitude: 41.897075,
  },
  {
    longitude: -87.630844,
    latitude: 41.897301,
  },
  {
    longitude: -87.63239,
    latitude: 41.897723,
  },
  {
    longitude: -87.631698,
    latitude: 41.897815,
  },
  {
    longitude: -87.631278,
    latitude: 41.89782,
  },
  {
    longitude: -87.627997,
    latitude: 41.897908,
  },
  {
    longitude: -87.637328,
    latitude: 41.898009,
  },
  {
    longitude: -87.628434,
    latitude: 41.898155,
  },
  {
    longitude: -87.621274,
    latitude: 41.89819,
  },
  {
    longitude: -87.621404,
    latitude: 41.898695,
  },
  {
    longitude: -87.620549,
    latitude: 41.898708,
  },
  {
    longitude: -87.627869,
    latitude: 41.898711,
  },
  {
    longitude: -87.628787,
    latitude: 41.899393,
  },
  {
    longitude: -87.636983,
    latitude: 41.899438,
  },
  {
    longitude: -87.633232,
    latitude: 41.900897,
  },
  {
    longitude: -87.62944,
    latitude: 41.902114,
  },
  {
    longitude: -87.633271,
    latitude: 41.902482,
  },
  {
    longitude: -87.630382,
    latitude: 41.902861,
  },
  {
    longitude: -87.629519,
    latitude: 41.902975,
  },
  {
    longitude: -87.6337,
    latitude: 41.903165,
  },
  {
    longitude: -87.629336,
    latitude: 41.903399,
  },
  {
    longitude: -87.631036,
    latitude: 41.904145,
  },
  {
    longitude: -87.631801,
    latitude: 41.904262,
  },
  {
    longitude: -87.626169,
    latitude: 41.904455,
  },
  {
    longitude: -87.628171,
    latitude: 41.907031,
  },
  {
    longitude: -87.634927,
    latitude: 41.907146,
  },
  {
    longitude: -87.626322,
    latitude: 41.907993,
  },
  {
    longitude: -87.628982,
    latitude: 41.876547,
  },
  {
    longitude: -87.625407,
    latitude: 41.876715,
  },
  {
    longitude: -87.629361,
    latitude: 41.877952,
  },
  {
    longitude: -87.623759,
    latitude: 41.850963,
  },
  {
    longitude: -87.623036,
    latitude: 41.85321,
  },
  {
    longitude: -87.623387,
    latitude: 41.853829,
  },
  {
    longitude: -87.625126,
    latitude: 41.853877,
  },
  {
    longitude: -87.624163,
    latitude: 41.854128,
  },
  {
    longitude: -87.625082,
    latitude: 41.856147,
  },
  {
    longitude: -87.626214,
    latitude: 41.862123,
  },
  {
    longitude: -87.623613,
    latitude: 41.863862,
  },
  {
    longitude: -87.625525,
    latitude: 41.86392,
  },
  {
    longitude: -87.625257,
    latitude: 41.864701,
  },
  {
    longitude: -87.624577,
    latitude: 41.864817,
  },
  {
    longitude: -87.623621,
    latitude: 41.866024,
  },
  {
    longitude: -87.623581,
    latitude: 41.866811,
  },
  {
    longitude: -87.624624,
    latitude: 41.867039,
  },
  {
    longitude: -87.630907,
    latitude: 41.867278,
  },
  {
    longitude: -87.62466,
    latitude: 41.86843,
  },
  {
    longitude: -87.626008,
    latitude: 41.868735,
  },
  {
    longitude: -87.631365,
    latitude: 41.869594,
  },
  {
    longitude: -87.62705,
    latitude: 41.869869,
  },
  {
    longitude: -87.631306,
    latitude: 41.87031,
  },
  {
    longitude: -87.627074,
    latitude: 41.870873,
  },
  {
    longitude: -87.625406,
    latitude: 41.871108,
  },
  {
    longitude: -87.624743,
    latitude: 41.871149,
  },
  {
    longitude: -87.633248,
    latitude: 41.8712,
  },
  {
    longitude: -87.624252,
    latitude: 41.871775,
  },
  {
    longitude: -87.63135,
    latitude: 41.871849,
  },
  {
    longitude: -87.62725,
    latitude: 41.871938,
  },
  {
    longitude: -87.632709,
    latitude: 41.872153,
  },
  {
    longitude: -87.628373,
    latitude: 41.872522,
  },
  {
    longitude: -87.630484,
    latitude: 41.873007,
  },
  {
    longitude: -87.633746,
    latitude: 41.873065,
  },
  {
    longitude: -87.630978,
    latitude: 41.87314,
  },
  {
    longitude: -87.63332,
    latitude: 41.873724,
  },
  {
    longitude: -87.634909,
    latitude: 41.87431,
  },
  {
    longitude: -87.651596,
    latitude: 41.874932,
  },
  {
    longitude: -87.655599,
    latitude: 41.876323,
  },
  {
    longitude: -87.653301,
    latitude: 41.876383,
  },
]
