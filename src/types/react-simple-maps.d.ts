declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
      parallels?: [number, number];
    };
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
    children?: React.ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (data: {
      geographies: GeographyObject[];
      outline: object;
      borders: object;
    }) => React.ReactNode;
  }

  export interface GeographyObject {
    rsmKey: string;
    properties: {
      name?: string;
      [key: string]: unknown;
    };
    id?: string;
    geometry: object;
  }

  export interface GeographyProps {
    geography: GeographyObject;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    style?: React.CSSProperties;
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    children?: React.ReactNode;
  }

  export interface LineProps {
    from: [number, number];
    to: [number, number];
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: "butt" | "round" | "square";
    strokeDasharray?: string;
    className?: string;
    style?: React.CSSProperties;
  }

  export interface AnnotationProps {
    subject: [number, number];
    dx?: number;
    dy?: number;
    curve?: number;
    connectorProps?: React.SVGProps<SVGPathElement>;
    children?: React.ReactNode;
  }

  export interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    step?: [number, number];
    className?: string;
    style?: React.CSSProperties;
  }

  export interface SphereProps {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    className?: string;
    style?: React.CSSProperties;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<MarkerProps>;
  export const Line: React.FC<LineProps>;
  export const Annotation: React.FC<AnnotationProps>;
  export const Graticule: React.FC<GraticuleProps>;
  export const Sphere: React.FC<SphereProps>;
}
