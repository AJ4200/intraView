import Link from "next/link";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="page">
        <section className="card hero">
          <h1>Page not found</h1>
          <p>That page doesn&apos;t exist, or the link has changed.</p>
          <div className="actions" style={{ justifyContent: "center", marginTop: "1rem" }}>
            <Link className="btn" href="/">Back home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
