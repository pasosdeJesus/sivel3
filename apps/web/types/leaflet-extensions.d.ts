import 'leaflet'
import 'leaflet.markercluster'

declare module 'leaflet' {
  interface Map {
    toggleFullscreen?: () => void
  }

  function markerClusterGroup(options?: any): any
}

declare global {
  interface Window {
    selectCaso?: (id: string) => void
  }
}
