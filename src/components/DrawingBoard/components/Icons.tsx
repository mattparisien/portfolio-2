interface IconProps {
    width?: number;
    height?: number;
    stroke?: string;
    strokeActive?: string;
    strokeWidth?: number;
    className?: string;
}

export const SelectIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black", className }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.701 12.6399L19.333 10.3469C20.5762 9.91713 20.6178 8.17427 19.3965 7.6857L2.95369 1.10762C1.80982 0.650012 0.665618 1.76603 1.09456 2.92096L7.35821 19.7857C7.81593 21.0181 9.5581 21.0208 10.0197 19.7899L12.701 12.6399Z" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    )
}

export const TextIcon = ({ width = 15, height = 17, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 15 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.08571 15.4H7.35294M7.35294 15.4H10.7714M7.35294 15.4V1M7.35294 1H2.02857C1.46051 1 1 1.46051 1 2.02857V3.54118M7.35294 1H12.2538C12.8218 1 13.2823 1.46051 13.2823 2.02857V3.96471" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>

    )
}

export const PencilIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.4 14.2L7.6 17.8M2.8 14.2L14.6314 1.95543C15.9053 0.681526 17.9707 0.681524 19.2446 1.95542C20.5185 3.22932 20.5185 5.29472 19.2446 6.56863L7 18.4L1 20.2L2.8 14.2Z" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    )
}


export const CircleIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.2 10.6C20.2 15.9019 15.9019 20.2 10.6 20.2C5.29807 20.2 1 15.9019 1 10.6C1 5.29807 5.29807 1 10.6 1C15.9019 1 20.2 5.29807 20.2 10.6Z" stroke={stroke} stroke-width={strokeWidth} />
        </svg>

    )
}

export const SquareIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.6 1C18.5882 1 20.2 2.61178 20.2 4.6V16.6001C20.2 18.5883 18.5882 20.2001 16.6 20.2001H4.6C2.61177 20.2001 1 18.5883 1 16.6001L1 4.6C1 2.61177 2.61178 1 4.6 1L16.6 1Z" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    )
}

export const TriangleIcon = ({ width = 22, height = 19, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.6 1L20.2 17.8H1L10.6 1Z" stroke={stroke} stroke-width={strokeWidth} stroke-linejoin="round" />
        </svg>

    )
}

export const UploadIcon = ({ width = 18, height = 20, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 13.2044V16.8925C1 17.4514 1.21071 17.9875 1.58579 18.3827C1.96086 18.778 2.46957 19 3 19H15C15.5304 19 16.0391 18.778 16.4142 18.3827C16.7893 17.9875 17 17.4514 17 16.8925V13.2044M9.00074 12.9425L9.00074 1M9.00074 1L4.42931 5.56318M9.00074 1L13.5722 5.56318" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>

    )
}

export const PenIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.3186 11.2221C17.5033 10.7016 17.231 10.1299 16.7105 9.94526C16.1901 9.76057 15.6184 10.0328 15.4337 10.5533L17.3186 11.2221ZM14.3427 16.6183L15.2851 16.9527V16.9527L14.3427 16.6183ZM12.9712 17.8057L13.1674 18.7863V18.7863L12.9712 17.8057ZM1 20.2L0.015873 20.0225C-0.0428667 20.3483 0.0633795 20.682 0.299637 20.9138C0.535895 21.1456 0.871552 21.2455 1.19612 21.1806L1 20.2ZM3.18462 8.08526L4.16875 8.26273H4.16875L3.18462 8.08526ZM4.44496 6.65741L4.74323 7.61189H4.74323L4.44496 6.65741ZM10.6106 5.77834C11.1377 5.61361 11.4315 5.05273 11.2668 4.52559C11.1021 3.99844 10.5412 3.70465 10.014 3.86938L10.6106 5.77834ZM0.509458 19.2763C0.118934 19.6668 0.118934 20.3 0.509458 20.6905C0.899982 21.0811 1.53315 21.0811 1.92367 20.6905L0.509458 19.2763ZM7.12124 15.493C7.51176 15.1024 7.51176 14.4693 7.12124 14.0788C6.73071 13.6882 6.09755 13.6882 5.70703 14.0788L7.12124 15.493ZM19.8412 6.55638L20.5483 5.84928V5.84928L19.8412 6.55638ZM19.8412 8.2889L19.1341 7.5818V7.5818L19.8412 8.2889ZM12.9111 1.35882L12.204 0.65171V0.651711L12.9111 1.35882ZM14.6436 1.35882L13.9365 2.06592V2.06592L14.6436 1.35882ZM10.7454 5.25699L11.4525 4.54989V4.54989L10.7454 5.25699ZM10.7454 3.52447L11.4525 4.23158V4.23158L10.7454 3.52447ZM15.943 10.4546L15.2359 11.1617V11.1617L15.943 10.4546ZM17.6755 10.4546L18.3826 11.1617V11.1617L17.6755 10.4546ZM15.4337 10.5533L13.4003 16.2839L15.2851 16.9527L17.3186 11.2221L15.4337 10.5533ZM12.7751 16.8252L0.803884 19.2194L1.19612 21.1806L13.1674 18.7863L12.7751 16.8252ZM1.98413 20.3775L4.16875 8.26273L2.2005 7.9078L0.015873 20.0225L1.98413 20.3775ZM4.74323 7.61189L10.6106 5.77834L10.014 3.86938L4.14668 5.70293L4.74323 7.61189ZM4.16875 8.26273C4.22411 7.95573 4.44548 7.70493 4.74323 7.61189L4.14668 5.70293C3.13799 6.01814 2.38804 6.86778 2.2005 7.9078L4.16875 8.26273ZM13.4003 16.2839C13.3017 16.5618 13.0642 16.7673 12.7751 16.8252L13.1674 18.7863C14.1468 18.5904 14.9511 17.8941 15.2851 16.9527L13.4003 16.2839ZM1.92367 20.6905L7.12124 15.493L5.70703 14.0788L0.509458 19.2763L1.92367 20.6905ZM16.6501 9.74745L11.4525 4.54989L10.0383 5.9641L15.2359 11.1617L16.6501 9.74745ZM11.4525 4.23158L13.6182 2.06592L12.204 0.651711L10.0383 2.81736L11.4525 4.23158ZM13.9365 2.06592L19.1341 7.26349L20.5483 5.84928L15.3507 0.65171L13.9365 2.06592ZM19.1341 7.5818L16.9684 9.74745L18.3826 11.1617L20.5483 8.99601L19.1341 7.5818ZM19.1341 7.26349C19.222 7.35139 19.222 7.4939 19.1341 7.5818L20.5483 8.99601C21.4172 8.12706 21.4172 6.71822 20.5483 5.84928L19.1341 7.26349ZM13.6182 2.06592C13.7061 1.97803 13.8486 1.97803 13.9365 2.06592L15.3507 0.65171C14.4818 -0.217237 13.0729 -0.217236 12.204 0.65171L13.6182 2.06592ZM11.4525 4.54989C11.3646 4.46199 11.3646 4.31948 11.4525 4.23158L10.0383 2.81736C9.16938 3.68631 9.16938 5.09515 10.0383 5.9641L11.4525 4.54989ZM15.2359 11.1617C16.1048 12.0306 17.5137 12.0306 18.3826 11.1617L16.9684 9.74745C16.8805 9.83535 16.738 9.83535 16.6501 9.74745L15.2359 11.1617ZM7.55437 11.5948C8.12069 11.0285 9.03888 11.0285 9.6052 11.5948L11.0194 10.1806C9.67204 8.83321 7.48752 8.83321 6.14015 10.1806L7.55437 11.5948ZM9.6052 11.5948C10.1715 12.1611 10.1715 13.0793 9.6052 13.6456L11.0194 15.0598C12.3668 13.7125 12.3668 11.528 11.0194 10.1806L9.6052 11.5948ZM9.6052 13.6456C9.03888 14.2119 8.12069 14.2119 7.55437 13.6456L6.14016 15.0598C7.48753 16.4072 9.67204 16.4072 11.0194 15.0598L9.6052 13.6456ZM7.55437 13.6456C6.98805 13.0793 6.98805 12.1611 7.55437 11.5948L6.14015 10.1806C4.79278 11.528 4.79279 13.7125 6.14016 15.0598L7.55437 13.6456Z" fill={stroke} />
        </svg>

    )
}

export const HeartIcon = ({ width = 22, height = 20, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M2.40537 2.46538C3.30551 1.56552 4.52619 1.06001 5.79897 1.06001C7.07176 1.06001 8.29244 1.56552 9.19257 2.46538L10.599 3.87058L12.0054 2.46538C12.4482 2.00693 12.9778 1.64126 13.5634 1.3897C14.149 1.13813 14.7789 1.00572 15.4162 1.00018C16.0536 0.994643 16.6856 1.11609 17.2755 1.35744C17.8655 1.59879 18.4014 1.9552 18.8521 2.40589C19.3028 2.85657 19.6592 3.3925 19.9005 3.9824C20.1419 4.57231 20.2633 5.20437 20.2578 5.84171C20.2522 6.47905 20.1198 7.10891 19.8683 7.69452C19.6167 8.28014 19.251 8.8098 18.7926 9.25258L10.599 17.4474L2.40537 9.25258C1.50551 8.35245 1 7.13177 1 5.85898C1 4.5862 1.50551 3.36552 2.40537 2.46538Z" stroke={stroke} stroke-width={strokeWidth} stroke-linejoin="round" />
        </svg>

    )
}

export const StarIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.561 1.31391C10.7676 0.895364 11.3644 0.895364 11.571 1.31391L14.245 6.73203C14.327 6.89824 14.4856 7.01344 14.669 7.04009L20.6482 7.90893C21.1101 7.97604 21.2946 8.54367 20.9603 8.86946L16.6337 13.0869C16.501 13.2163 16.4404 13.4027 16.4717 13.5853L17.4931 19.5404C17.572 20.0004 17.0892 20.3513 16.676 20.1341L11.328 17.3224C11.164 17.2362 10.968 17.2362 10.8039 17.3224L5.45593 20.1341C5.0428 20.3513 4.55996 20.0004 4.63886 19.5404L5.66024 13.5853C5.69157 13.4027 5.631 13.2163 5.49828 13.0869L1.17165 8.86946C0.837423 8.54367 1.02185 7.97604 1.48375 7.90893L7.463 7.04009C7.64642 7.01344 7.80498 6.89824 7.88701 6.73203L10.561 1.31391Z" stroke={stroke} stroke-width={strokeWidth} stroke-linejoin="round" />
        </svg>

    )
}

export const EraserIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.2782 18.7414H5.84847L1.32859 14.2216C1.11813 14.0098 1 13.7235 1 13.4249C1 13.1264 1.11813 12.84 1.32859 12.6283L12.6283 1.32859C12.84 1.11813 13.1264 1 13.4249 1C13.7234 1 14.0098 1.11813 14.2216 1.32859L19.8714 6.97844C20.0819 7.19016 20.2 7.47655 20.2 7.77507C20.2 8.0736 20.0819 8.35999 19.8714 8.5717L16 12.4431M9.70167 18.7414L16 12.4431M8.51178 5.44511L16 12.4431" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>

    )
}

export const LineIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 21L21 1" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" />
        </svg>

    )
}

export const ChevronUpIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black", className }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M1 5.58344L6.00081 1L11 5.58344" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>

    )
}

export const LockOpenIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 17 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.575 6.48571C2.575 3.4468 4.98357 1 7.975 1C9.83842 1 11.4757 1.94943 12.4455 3.4M2.8 7.4C1.81 7.4 1 8.22286 1 9.22857V18.3714C1 19.3771 1.81 20.2 2.8 20.2H13.6C14.59 20.2 15.4 19.3771 15.4 18.3714V9.22857C15.4 8.22286 14.59 7.4 13.6 7.4H2.8Z" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" />
        </svg>

    )
}

export const LockClosedIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 17 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.8 7.4V6.48571C2.8 3.4468 5.20857 1 8.2 1C11.1914 1 13.6 3.4468 13.6 6.48571V7.4M2.8 7.4C1.81 7.4 1 8.22286 1 9.22857V18.3714C1 19.3771 1.81 20.2 2.8 20.2H13.6C14.59 20.2 15.4 19.3771 15.4 18.3714V9.22857C15.4 8.22286 14.59 7.4 13.6 7.4M2.8 7.4H13.6" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" />
        </svg>

    )
}

export const TrashIcon = ({ width = 22, height = 22, strokeWidth = 2 }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4.17647H17M6 1H12M12.5 19H5.5C4.39543 19 3.5 18.0519 3.5 16.8824L3.0434 5.27937C3.01973 4.67783 3.47392 4.17647 4.04253 4.17647H13.9575C14.5261 4.17647 14.9803 4.67783 14.9566 5.27937L14.5 16.8824C14.5 18.0519 13.6046 19 12.5 19Z" stroke="black" stroke-width={strokeWidth} stroke-linecap="round" />
        </svg>
    )
}

export const TVIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.625 17L10 13.5714L13.375 17M3.25 13.5714H16.75C17.9926 13.5714 19 12.5481 19 11.2857V3.28571C19 2.02335 17.9926 1 16.75 1H3.25C2.00736 1 1 2.02335 1 3.28571V11.2857C1 12.5481 2.00736 13.5714 3.25 13.5714Z" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>

    )
}

export const CheckmarkIcon = ({ width = 22, height = 22, strokeWidth = 2, stroke = "black" }: IconProps) => {
    return (
        <svg width={width} height={height} viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.6 1L3.44048 8.2L1 5.74572" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    )
}

/** Cursor icons — used for the local and remote custom cursors */

export const CursorArrowIcon = ({ width = 17, height = 17, fill = "#1a1a1a", style }: { width?: number; height?: number; fill?: string; style?: React.CSSProperties }) => (
    <svg width={width} height={height} viewBox="0 0 317 354" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
        <path
            d="M0.222591 12C-1.53354 3.60665 7.45159 -2.92141 14.8914 1.34245L311.358 171.251C318.902 175.574 317.649 186.816 309.339 189.372L165.447 233.635C163.219 234.321 161.303 235.767 160.033 237.723L88.0181 348.658C83.1885 356.097 71.7717 353.964 69.9552 345.282L0.222591 12Z"
            fill={fill}
            stroke="white"
            strokeWidth="14"
            style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.8))" }}
        />
    </svg>
)

export const PencilCursorIcon = ({ style }: { style?: React.CSSProperties }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "translate(-2px, -18px)", ...style }}>
        <path d="M15 1L19 5L6.5 17.5L1 19L2.5 13.5Z" fill="#1a1a1a" stroke="white" strokeWidth="1" strokeLinejoin="round" />
        <line x1="12.5" y1="3.5" x2="16.5" y2="7.5" stroke="white" strokeWidth="0.8" />
    </svg>
)

export const BrushCursorIcon = ({ style }: { style?: React.CSSProperties }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "translate(-2px, -18px)", ...style }}>
        <path d="M15 1L19 5L7 17C5.5 17.5 2 18.5 1.5 18C1 17.5 2 14 2.5 12.5Z" fill="#1a1a1a" stroke="white" strokeWidth="1" strokeLinejoin="round" />
        <ellipse cx="2.2" cy="17.8" rx="1.8" ry="1.2" fill="#555" />
        <line x1="12.5" y1="3.5" x2="16.5" y2="7.5" stroke="white" strokeWidth="0.8" />
    </svg>
)