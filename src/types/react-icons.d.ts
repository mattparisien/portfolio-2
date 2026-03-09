// react-icons v5 types `IconType` as returning `React.ReactNode`, but
// @types/react v19 includes `Promise<AwaitedReactNode>` in `ReactNode`, which
// breaks JSX component type-checking. Narrowing the return type to
// `React.JSX.Element` fixes the incompatibility.
import type { SVGAttributes } from "react";

declare module "react-icons/lib" {
    export interface IconBaseProps extends SVGAttributes<SVGElement> {
        children?: React.ReactNode;
        size?: string | number;
        color?: string;
        title?: string;
    }
    export type IconType = (props: IconBaseProps) => React.JSX.Element;
}
