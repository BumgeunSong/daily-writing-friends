interface FormHeaderProps {
    title: string
    subtitle: string
}

export default function FormHeader({ title, subtitle }: FormHeaderProps) {
    return (
        <header className="mb-8 mx-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>
        </header>
    )
}
