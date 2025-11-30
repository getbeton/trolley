import Link from "next/link"

export function Footer() {
  const links = [
    {
      href: "https://getbeton.ai/?utm_source=app&utm_medium=footer&utm_campaign=beton-trolley",
      label: "Beton",
    },
    {
      href: "https://blog.getbeton.ai/?utm_source=app&utm_medium=footer&utm_campaign=beton-trolley",
      label: "Blog",
    },
    {
      href: "https://github.com/getbeton?utm_source=app&utm_medium=footer&utm_campaign=beton-trolley",
      label: "GitHub",
    },
    {
      href: "https://x.com/stochasticmacaw?utm_source=app&utm_medium=footer&utm_campaign=beton-trolley",
      label: "Twitter",
    },
  ]

  return (
    <footer className="border-t bg-background">
      <div className="container flex h-14 items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">
          Made with ❤️ by{" "}
          <Link
            href="https://getbeton.ai/?utm_source=app&utm_medium=footer&utm_campaign=beton-trolley"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            Beton
          </Link>
        </p>
        <nav className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
