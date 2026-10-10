import { FaFacebookF } from "react-icons/fa";
import {
  LuArrowUpRight,
  LuGem,
  LuHeartHandshake,
  LuMail,
  LuMapPin,
  LuPhone,
  LuShieldCheck,
  LuSparkles,
} from "react-icons/lu";
import { Link } from "react-router-dom";
import Image from "../components/Image";
import DynamicLogo from "../components/DynamicLogo";
import { useGetTopProductsQuery } from "../store/features/api/homeApis/theme-one/homeApiThemeOne";

const brandIntroduction =
  "Silver Studio brings timeless elegance and modern craftsmanship together through premium Silver jewelry for both men and women. From sophisticated rings and necklaces to stylish bracelets and statement pieces, every collection is designed to add confidence, beauty, and individuality to your everyday style.";

const contactDetails = {
  email: "silverstudio26@gmail.com",
  phone: "+8801308552222",
  address:
    "House-3, Road-9, Avenue-5, Block-C, Section-11, Mirpur, Dhaka- 1216.",
  mapUrl:
    "https://www.google.com/search?q=House-3%2C%20Road-9%2C%20Avenue-5%2C%20Block-C%2C%20Section-11%2C%20Mirpur%2C%20Dhaka-%201216.&oq=House-3%2C%20Road-9%2C%20Avenue-5%2C%20Block-C%2C%20Section-11%2C%20Mirpur%2C%20Dhaka-%201216.",
  facebook: "https://www.facebook.com/silverstudiobd",
};

const values = [
  {
    icon: LuGem,
    title: "Thoughtful Design",
    description:
      "Jewelry shaped around timeless silhouettes, modern details, and effortless everyday styling.",
  },
  {
    icon: LuShieldCheck,
    title: "Reliable Craft",
    description:
      "Every piece is selected with close attention to finish, comfort, and lasting visual appeal.",
  },
  {
    icon: LuHeartHandshake,
    title: "Personal Service",
    description:
      "A warm, dependable shopping experience built around confidence, care, and individuality.",
  },
];

const contactCards = [
  {
    icon: LuMail,
    label: "Email us",
    value: contactDetails.email,
    href: `mailto:${contactDetails.email}`,
    external: false,
  },
  {
    icon: LuPhone,
    label: "Call us",
    value: contactDetails.phone,
    href: `tel:${contactDetails.phone}`,
    external: false,
  },
  {
    icon: LuMapPin,
    label: "Visit us",
    value: contactDetails.address,
    href: contactDetails.mapUrl,
    external: true,
  },
  {
    icon: FaFacebookF,
    label: "Facebook",
    value: "Silver Studio BD",
    href: contactDetails.facebook,
    external: true,
  },
];

export const AboutUsPage = () => {
  const { data: topProducts } = useGetTopProductsQuery();
  const featuredProducts = topProducts?.products?.slice(0, 3) || [];

  return (
    <div className="overflow-hidden bg-white text-zinc-950">
      <section className="relative bg-[#f7f2ec]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-black/10" />
        <div className="pointer-events-none absolute -right-10 top-10 size-48 rounded-full border border-black/10" />

        <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20 lg:py-24">
          <div className="relative z-[1] max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600">
              Our story
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Elegance designed for{" "}
              <span className="font-normal italic">every story.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-700 sm:text-lg">
              {brandIntroduction}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-black px-7 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Explore jewelry
                <LuArrowUpRight className="text-lg" />
              </Link>
              <Link
                to="/pages/contact-us"
                className="inline-flex min-h-12 items-center justify-center border border-black/25 px-7 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-300 hover:border-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Contact us
              </Link>
            </div>
          </div>

          <div className="grid min-h-[430px] grid-cols-[1.18fr_0.82fr] gap-3 sm:min-h-[540px] sm:gap-4">
            <div className="overflow-hidden rounded-t-[120px] bg-[#e8ddcf]">
              {featuredProducts[0] ? (
                <Image
                  src={featuredProducts[0].thumbnailImg}
                  alt={featuredProducts[0].name}
                  className="h-full w-full object-contain transition-transform duration-300 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-b from-[#eadfce] to-[#d4c2af]" />
              )}
            </div>
            <div className="grid grid-rows-2 gap-3 sm:gap-4">
              {[featuredProducts[1], featuredProducts[2]].map(
                (product, index) => (
                  <div
                    key={product?.id || index}
                    className="overflow-hidden bg-white/75 ring-1 ring-black/5"
                  >
                    {product ? (
                      <Image
                        src={product.thumbnailImg}
                        alt={product.name}
                        className="h-full w-full object-contain transition-transform duration-300 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-white to-[#ded0c1]" />
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Artistry meets reliability
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Made to complement the way you live.
            </h2>
          </div>
          <div className="grid gap-6 border-l border-black/10 pl-7 sm:grid-cols-2 sm:gap-8 sm:pl-10">
            <p className="text-base leading-8 text-zinc-700">
              We believe jewelry should feel expressive without feeling
              complicated. Our collections bring together refined shapes,
              contemporary styling, and pieces that move naturally from everyday
              moments to memorable occasions.
            </p>
            <p className="text-base leading-8 text-zinc-700">
              Whether you are choosing something for yourself or marking a
              special moment for someone you love, Silver Studio is here to help
              you find a piece that feels personal.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 py-16 text-white md:py-24">
        <div className="container">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                What guides us
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                The Silver Studio standard
              </h2>
            </div>
            <LuSparkles className="hidden text-5xl text-[#d7c2a9] md:block" />
          </div>
          <div className="grid gap-px overflow-hidden bg-white/15 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article key={value.title} className="bg-zinc-950 p-7 sm:p-9">
                  <Icon className="text-3xl text-[#d7c2a9]" />
                  <h3 className="mt-8 text-xl font-semibold">{value.title}</h3>
                  <p className="mt-4 leading-7 text-white/65">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container py-16 text-center md:py-24">
        <DynamicLogo alt="Silver Studio" className="mx-auto !max-h-20" />
        <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-zinc-700">
          Find the piece that reflects your confidence, your beauty, and your
          individual style.
        </p>
        <Link
          to="/products"
          className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 border-b border-black px-1 text-sm font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
        >
          Shop the collection
          <LuArrowUpRight className="text-lg" />
        </Link>
      </section>
    </div>
  );
};

export const ContactUsPage = () => (
  <div className="overflow-hidden bg-white text-zinc-950">
    <section className="relative overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#d8c4aa]/10 blur-3xl" />
      <div className="container relative z-[1] py-16 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d8c4aa]">
          Contact Silver Studio
        </p>
        <div className="mt-5 grid items-end gap-8 lg:grid-cols-[1fr_0.72fr]">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            Let’s find the right piece{" "}
            <span className="font-normal italic">together.</span>
          </h1>
          <p className="max-w-xl text-base leading-8 text-white/65 sm:text-lg">
            Questions about a product, your order, or choosing a gift? Reach out
            through the channel that works best for you.
          </p>
        </div>
      </div>
    </section>

    <section className="container py-14 md:py-20">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contactCards.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer noopener" : undefined}
              className="group flex min-h-56 flex-col border border-black/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-black/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#f4eee7] text-xl">
                <Icon />
              </span>
              <span className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {item.label}
              </span>
              <span className="mt-3 break-words text-base font-medium leading-7">
                {item.value}
              </span>
              <LuArrowUpRight className="mt-auto self-end text-xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </a>
          );
        })}
      </div>
    </section>

    <section className="container pb-16 md:pb-24">
      <div className="grid overflow-hidden bg-[#f7f2ec] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="p-8 sm:p-12 lg:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Our studio
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
            Visit us in Mirpur, Dhaka.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-zinc-700">
            {contactDetails.address}
          </p>
          <a
            href={contactDetails.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 bg-black px-7 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Open in Google Maps
            <LuArrowUpRight className="text-lg" />
          </a>
        </div>
        <div className="relative flex min-h-80 items-center justify-center overflow-hidden bg-[#ded0c0] p-10">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(0,0,0,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.13)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex size-40 items-center justify-center rounded-full border border-black/15 bg-white/55 backdrop-blur-sm">
            <div className="flex size-24 items-center justify-center rounded-full bg-black text-4xl text-white shadow-xl">
              <LuMapPin />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-t border-black/10">
      <div className="container flex flex-col items-start justify-between gap-7 py-12 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Prefer social?
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Follow Silver Studio on Facebook.
          </h2>
        </div>
        <a
          href={contactDetails.facebook}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-12 items-center justify-center gap-3 border border-black px-6 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-300 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <FaFacebookF />
          Visit Facebook
        </a>
      </div>
    </section>
  </div>
);
