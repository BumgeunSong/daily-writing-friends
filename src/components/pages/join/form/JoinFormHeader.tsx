interface FormHeaderProps {
    title: string
    subtitle: string
}

export default function FormHeader({ title, subtitle }: FormHeaderProps) {
    return (
        <header className="mx-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
        </header>
    )
}
