export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
        Your one-sentence pitch goes here.
      </h1>
      <p className="text-lg text-neutral-600">
        Replace this hero with real copy. No lorem ipsum — the page is the
        product.
      </p>
      <div>
        <a
          href="#contact"
          className="inline-flex h-11 items-center rounded-md bg-neutral-900 px-6 font-medium text-white"
        >
          Primary CTA
        </a>
      </div>
    </main>
  );
}
