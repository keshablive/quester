export type RouteType = 'public' | 'protected';

export interface RouteConfig {
    path: string;
    name: string;
    type: RouteType;
    label?: string;
}
