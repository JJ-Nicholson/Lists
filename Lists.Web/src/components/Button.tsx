import type { ComponentProps } from "react";
import { Link, type LinkProps } from "react-router";

const sizeClasses = {
    default: "",
    large: "button--large",
} as const;

const variantClasses = {
    default: "",
    edit: "button--edit",
    header: "button--header",
    reviewAccess: "button--review-access",
    danger: "button--danger",
    disabled: "button--disabled",
} as const;

type ButtonSize = keyof typeof sizeClasses;
type ButtonVariant = keyof typeof variantClasses;

type ButtonProps = ComponentProps<"button"> & {
    size?: ButtonSize;
    variant?: ButtonVariant;
};

type ButtonLinkProps = LinkProps & {
    size?: ButtonSize;
    variant?: ButtonVariant;
};

function getButtonClassName(
    size: ButtonSize,
    variant: ButtonVariant,
    className?: string,
) {
    return [
        "button",
        sizeClasses[size],
        variantClasses[variant],
        className,
    ]
        .filter(Boolean)
        .join(" ");
}

export function Button({
    children,
    className = "",
    size = "default",
    type = "button",
    variant = "default",
    ...props
}: ButtonProps) {
    return (
        <button
            className={getButtonClassName(size, variant, className)}
            type={type}
            {...props}
        >
            {children}
        </button>
    );
}

export function ButtonLink({
    children,
    className = "",
    size = "default",
    variant = "default",
    ...props
}: ButtonLinkProps) {
    return (
        <Link
            className={getButtonClassName(size, variant, className)}
            {...props}
        >
            {children}
        </Link>
    );
}
