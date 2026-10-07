import { useParams } from "react-router-dom";
import SectionTitle from "../components/titles/SectionTitle";
import { useGetPageQuery } from "../store/features/api/pagesApi";
import { AboutUsPage, ContactUsPage } from "./BrandPages";

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const isBrandPage = slug === "about-us" || slug === "contact-us";
  const { data: pageContent, isLoading } = useGetPageQuery(slug!, {
    skip: isBrandPage,
  });

  if (slug === "about-us") {
    return <AboutUsPage />;
  }

  if (slug === "contact-us") {
    return <ContactUsPage />;
  }

  if (isLoading || !pageContent) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <SectionTitle title={pageContent.title} />

      <div
        className=""
        dangerouslySetInnerHTML={{
          __html: pageContent.content,
        }}
      ></div>
    </div>
  );
};

export default DynamicPage;
