export type ElementType = "text" | "image" | "button";

export type ElementRole =
  | "primary"
  | "hero"
  | "action"
  | "branding"
  | "secondary";

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rect extends Position, Size {}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementConstraints {
  minWidth?: number;
  minHeight?: number;
  preferredWidth?: number;
  preferredHeight?: number;
  minFontSize?: number;
  maxFontSize?: number;
  minTapTarget?: number;
}

export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: number;
  content: string;
  constraints?: ElementConstraints;
}

export interface AdSpec {
  elements: AdElement[];
}

export interface SurfaceProfile {
  id: string;
  width: number;
  height: number;
  safeArea?: SafeArea;
  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: "near" | "normal" | "far";
  touchOnly?: boolean;
}

export interface ResolvedElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  rect: Rect;
  visible: boolean;
  fontSize?: number;
  content: string;
}

export interface ResolutionDecision {
  elementId: string;
  action:
    | "placed"
    | "resized"
    | "repositioned"
    | "truncated"
    | "hidden";
  reason: string;
}

export interface ResolvedLayout {
  surface: SurfaceProfile;
  elements: ResolvedElement[];
  decisions: ResolutionDecision[];
  valid: boolean;
}