import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'
import { useEffect, useRef } from 'react'

// https://github.com/googlemaps/js-samples/pull/952/files

export function useDeepCompareEffectForMaps(
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

    // @ts-ignore
    return deepEqual(a, b)
  }
)
