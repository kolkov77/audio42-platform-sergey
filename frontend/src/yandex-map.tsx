import { useEffect, useMemo, useRef, useState } from "react"
import { getCurrentLocale } from "./i18n"

type MapPoint = {
  pointId?: number
  lat: number
  lng: number
  title: string
  balloonHtml?: string
}

declare global {
  interface Window {
    ymaps?: any
  }
}

const DEFAULT_CENTER: [number, number] = [55.3552, 86.0873]
const PUBLIC_YANDEX_MAPS_API_KEY = "9691db7d-850a-4037-b41b-1c7b199bdc6d"
const ACTIVE_POINT_ZOOM = 16
const ACTIVE_POINT_ICON =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2258%22%20height%3D%2274%22%20viewBox%3D%220%200%2058%2074%22%3E%3Ccircle%20cx%3D%2229%22%20cy%3D%2229%22%20r%3D%2226%22%20fill%3D%22%23ff3b30%22%2F%3E%3Cpath%20fill%3D%22%23ff3b30%22%20d%3D%22M29%2060%2019%2047h20z%22%2F%3E%3Ccircle%20cx%3D%2229%22%20cy%3D%2268%22%20r%3D%225%22%20fill%3D%22%23ff3b30%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%2F%3E%3Crect%20x%3D%2226.5%22%20y%3D%2212%22%20width%3D%225%22%20height%3D%2237%22%20rx%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M12%2028l9-9h9v18h-9zm34%200l-9-9h-9v18h9z%22%2F%3E%3C%2Fsvg%3E"
const INACTIVE_POINT_ICON =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2228%22%20height%3D%2228%22%20viewBox%3D%220%200%2028%2028%22%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%2214%22%20r%3D%2212%22%20fill%3D%22%23ff8a1d%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%2214%22%20r%3D%226%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E"

function focusMapOnPoint(map: any, center: [number, number]) {
  map.container?.fitToViewport?.()

  if (map.action?.setCenter) {
    map.action.setCenter(center, ACTIVE_POINT_ZOOM, {
      duration: 300,
      timingFunction: "ease-in-out",
    })
  } else {
    map.setCenter(center, ACTIVE_POINT_ZOOM, { duration: 300 })
  }

  map.setZoom?.(ACTIVE_POINT_ZOOM, {
    duration: 300,
    checkZoomRange: true,
  })
}

function fitMapToAllPoints(map: any) {
  const bounds = map.geoObjects.getBounds()
  if (!bounds) {
    return
  }

  map.container?.fitToViewport?.()
  map.setBounds(bounds, {
    checkZoomRange: true,
    zoomMargin: 24,
  })
}

function markerOptions(ymaps: any, isSelected: boolean) {
  if (!isSelected) {
    return {
      iconLayout: "default#imageWithContent",
      iconImageHref: INACTIVE_POINT_ICON,
      iconImageSize: [28, 28],
      iconImageOffset: [-14, -14],
      iconContentLayout: ymaps.templateLayoutFactory.createClass(
        '<div style="position:absolute;left:23px;top:5px;white-space:nowrap;color:rgba(0,0,0,.75);font:600 12px Arial,sans-serif;text-shadow:0 1px 2px #fff,0 0 4px #fff;">$[properties.iconContent]</div>',
      ),
      iconContentOffset: [0, 0],
    }
  }

  return {
    iconLayout: "default#imageWithContent",
    iconImageHref: ACTIVE_POINT_ICON,
    iconImageSize: [58, 74],
    iconImageOffset: [-29, -68],
    iconContentLayout: ymaps.templateLayoutFactory.createClass(
      '<div style="position:absolute;left:48px;top:18px;white-space:nowrap;background:#fff;color:#111827;border-radius:5px;padding:5px 9px;font:700 13px Arial,sans-serif;box-shadow:0 2px 7px rgba(0,0,0,.18);">$[properties.iconContent]</div>',
    ),
    iconContentOffset: [0, 0],
    zIndex: 700,
  }
}

function yandexLanguage() {
  return getCurrentLocale() === "ru" ? "ru_RU" : "en_US"
}

function loadYandexMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Карта доступна только в браузере."))
  }

  if (window.ymaps) {
    return Promise.resolve(window.ymaps)
  }

  return new Promise<any>((resolve, reject) => {
    const lang = yandexLanguage()
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-yandex-maps="${lang}"]`)

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.ymaps))
      existingScript.addEventListener("error", () =>
        reject(new Error("Не удалось загрузить скрипт Яндекс.Карт.")),
      )
      return
    }

    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=${lang}`
    script.async = true
    script.dataset.yandexMaps = lang
    script.onload = () => resolve(window.ymaps)
    script.onerror = () => reject(new Error("Не удалось загрузить скрипт Яндекс.Карт."))
    document.head.appendChild(script)
  })
}

export function YandexMap({
  points,
  selectedPointId,
  className = "",
  emptyMessage = "Для этого маршрута ещё не добавлены точки на карту.",
  onPointClick,
}: {
  points: MapPoint[]
  selectedPointId?: number | null
  polyline?: number[][]
  className?: string
  emptyMessage?: string
  onPointClick?: (point: MapPoint) => void
}) {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || PUBLIC_YANDEX_MAPS_API_KEY
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const placemarkRefs = useRef<Map<number, any>>(new Map())
  const onPointClickRef = useRef(onPointClick)
  const [mapError, setMapError] = useState("")

  const mapCenter = useMemo<[number, number]>(() => {
    if (points.length === 0) {
      return DEFAULT_CENTER
    }

    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length
    return [lat, lng]
  }, [points])

  const selectedPoint = useMemo(
    () => points.find((point) => point.pointId !== undefined && point.pointId === selectedPointId) ?? null,
    [points, selectedPointId],
  )

  useEffect(() => {
    onPointClickRef.current = onPointClick
  }, [onPointClick])

  useEffect(() => {
    if (!apiKey) {
      setMapError("Ключ Яндекс.Карт ещё не добавлен в сборку сайта.")
      return
    }

    let destroyed = false

    void loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (destroyed || !containerRef.current) {
          return
        }

        setMapError("")

        ymaps.ready(() => {
          if (destroyed || !containerRef.current) {
            return
          }

          mapRef.current?.destroy?.()

          const map = new ymaps.Map(containerRef.current, {
            center: selectedPoint ? [selectedPoint.lat, selectedPoint.lng] : mapCenter,
            zoom: selectedPoint ? ACTIVE_POINT_ZOOM : points.length > 1 ? 14 : 13,
            controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
          })

          placemarkRefs.current = new Map()

          points.forEach((point) => {
            const isSelected = point.pointId !== undefined && point.pointId === selectedPointId
            const placemark = new ymaps.Placemark(
              [point.lat, point.lng],
              {
                balloonContentHeader: point.title,
                balloonContentBody: point.balloonHtml ?? "",
                iconCaption: isSelected ? "" : point.title,
                iconContent: point.title,
              },
              markerOptions(ymaps, isSelected),
            )

            if (point.pointId !== undefined) {
              placemarkRefs.current.set(point.pointId, placemark)
            }

            placemark.events.add("click", () => onPointClickRef.current?.(point))

            map.geoObjects.add(placemark)
          })

          if (selectedPoint) {
            window.setTimeout(() => {
              if (!destroyed) {
                focusMapOnPoint(map, [selectedPoint.lat, selectedPoint.lng])
              }
            }, 0)
          } else if (points.length > 0) {
            fitMapToAllPoints(map)
          }

          mapRef.current = map
        })
      })
      .catch((error) => {
        if (!destroyed) {
          setMapError(error instanceof Error ? error.message : "Не удалось загрузить карту.")
        }
      })

    return () => {
      destroyed = true
      mapRef.current?.destroy?.()
      mapRef.current = null
      placemarkRefs.current = new Map()
    }
  }, [apiKey, mapCenter, points, selectedPoint])

  useEffect(() => {
    placemarkRefs.current.forEach((placemark, pointId) => {
      const point = points.find((candidate) => candidate.pointId === pointId)
      placemark.options.set(markerOptions(window.ymaps, pointId === selectedPointId))
      placemark.properties.set("iconCaption", pointId === selectedPointId ? "" : point?.title || "")
    })

    const map = mapRef.current
    if (!map) {
      return
    }

    if (!selectedPoint) {
      fitMapToAllPoints(map)
      return
    }

    const center: [number, number] = [selectedPoint.lat, selectedPoint.lng]
    const repeatFocus = () => focusMapOnPoint(map, center)
    repeatFocus()

    const timer = window.setTimeout(() => {
      repeatFocus()
      window.setTimeout(repeatFocus, 450)
      window.setTimeout(repeatFocus, 1100)
    }, 650)

    return () => window.clearTimeout(timer)
  }, [points, selectedPoint, selectedPointId])

  if (mapError) {
    return (
      <div className={`panel map-surface map-fallback ${className}`.trim()}>
        <h3>Карта маршрута</h3>
        <p>{mapError}</p>
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className={`panel map-surface map-fallback ${className}`.trim()}>
        <h3>Карта маршрута</h3>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return <div ref={containerRef} className={`map-surface ${className}`.trim()} />
}
