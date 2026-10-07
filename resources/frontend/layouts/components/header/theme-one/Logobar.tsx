import { CSSProperties, useEffect, useRef, useState } from "react";
import { FaBars, FaRegUserCircle } from "react-icons/fa";
import { FaCircleUser } from "react-icons/fa6";
import { IoCartOutline, IoHeartOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import DynamicLogo from "../../../../components/DynamicLogo";
import SearchForm from "../../../../components/inputs/SearchForm";
import { useLazyGetWishListQuery } from "../../../../store/features/api/productApi";
import { useAuth } from "../../../../store/features/auth/authSlice";
import { togglePopup } from "../../../../store/features/popup/popupSlice";
import { useAppDispatch } from "../../../../store/store";
import { paddedNumber } from "../../../../utils/numberFormatter";
import AvatarDropdownMenu from "../AvatarDropdownMenu";
import HeaderSocialLinks from "../HeaderSocialLinks";

interface MiddleSectionConfig {
  bg_color?: string;
  text_color?: string;
  search_input_bg_color?: string;
  search_input_text_color?: string;
  search_input_placeholder_color?: string;
  search_input_border_color?: string;
  search_input_icon_color?: string;
  search_result_bg_color?: string;
  search_result_text_color?: string;
  search_result_category_bg_color?: string;
  search_result_category_text_color?: string;
  search_result_hover_color?: string;
}

interface Props {
  middleSectionConfig?: MiddleSectionConfig;
}

const Logobar = ({ middleSectionConfig }: Props) => {
  const navigate = useNavigate();
  const { user, carts } = useAuth();
  const dispatch = useAppDispatch();
  const navbarEl = useRef<HTMLDivElement>(null);
  const [getWishlist, { data: wishlist }] = useLazyGetWishListQuery();
  const showCustomerMenu = window.config.customerMenu?.enabled ?? true;

  const [totalProductInCart, setTotalProductInCart] = useState(0);
  const middleBackgroundColor = middleSectionConfig?.bg_color || "#ffffff";
  const middleTextColor = middleSectionConfig?.text_color || "#5D7261";
  const searchInputBackgroundColor =
    middleSectionConfig?.search_input_bg_color || "#ffffff";
  const searchInputTextColor =
    middleSectionConfig?.search_input_text_color || "#111827";
  const searchInputPlaceholderColor =
    middleSectionConfig?.search_input_placeholder_color || "#6B7280";
  const searchInputBorderColor =
    middleSectionConfig?.search_input_border_color || middleTextColor;
  const searchInputIconColor =
    middleSectionConfig?.search_input_icon_color || middleTextColor;
  const searchResultBackgroundColor =
    middleSectionConfig?.search_result_bg_color || "#ffffff";
  const searchResultTextColor =
    middleSectionConfig?.search_result_text_color || "#111827";
  const searchResultCategoryBackgroundColor =
    middleSectionConfig?.search_result_category_bg_color || "#E5E7EB";
  const searchResultCategoryTextColor =
    middleSectionConfig?.search_result_category_text_color || "#111827";
  const searchResultHoverColor =
    middleSectionConfig?.search_result_hover_color || middleTextColor;

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 138) {
        navbarEl.current?.classList.add("border-b");
      } else {
        navbarEl.current?.classList.remove("border-b");
      }
    });

    return () => {
      window.removeEventListener("scroll", () => {});
    };
  }, []);

  useEffect(() => {
    let totalProducts = 0;

    carts.forEach((item) => {
      totalProducts += item.qty;
    });

    setTotalProductInCart(totalProducts);
  }, [carts]);

  // get wishlist if user is logged in
  useEffect(() => {
    if (user) {
      getWishlist(undefined, true);
    }
  }, [user]);

  // open wishlist page if user is logged in
  // otherwise open signin popup
  const handleWishlistClick = () => {
    if (user) {
      navigate("/wishlist");
    } else {
      dispatch(togglePopup("signin"));
    }
  };

  return (
    <div
      className="header-one-middle-section sticky top-0 z-[3] flex min-h-[76px] items-center justify-center py-2 text-black/70 md:h-[70px] md:py-0 xl:h-[92px]"
      ref={navbarEl}
      style={
        {
          backgroundColor: middleBackgroundColor,
          color: middleTextColor,
          "--header-one-middle-text-color": middleTextColor,
          "--header-one-search-input-bg-color": searchInputBackgroundColor,
          "--header-one-search-input-text-color": searchInputTextColor,
          "--header-one-search-input-placeholder-color":
            searchInputPlaceholderColor,
          "--header-one-search-input-border-color": searchInputBorderColor,
          "--header-one-search-input-icon-color": searchInputIconColor,
          "--header-one-search-result-bg-color": searchResultBackgroundColor,
          "--header-one-search-result-text-color": searchResultTextColor,
          "--header-one-search-result-category-bg-color":
            searchResultCategoryBackgroundColor,
          "--header-one-search-result-category-text-color":
            searchResultCategoryTextColor,
          "--header-one-search-result-hover-color": searchResultHoverColor,
        } as CSSProperties
      }
    >
      <style>{`
                .header-one-middle-section .search-form__input {
                    background-color: var(--header-one-search-input-bg-color) !important;
                    border-color: var(--header-one-search-input-border-color) !important;
                    color: var(--header-one-search-input-text-color) !important;
                }

                .header-one-middle-section .search-form__input::placeholder {
                    color: var(--header-one-search-input-placeholder-color);
                    opacity: 1;
                }

                .header-one-middle-section .search-form button {
                    color: var(--header-one-search-input-icon-color) !important;
                }

                .header-one-middle-section .suggestions {
                    background-color: var(--header-one-search-result-bg-color) !important;
                    color: var(--header-one-search-result-text-color) !important;
                }

                .header-one-middle-section .suggestions > p {
                    color: var(--header-one-search-result-text-color);
                }

                .header-one-middle-section .suggestions .bg-gray-200 {
                    background-color: var(--header-one-search-result-category-bg-color) !important;
                    color: var(--header-one-search-result-category-text-color) !important;
                }

                .header-one-middle-section .suggestions a {
                    color: var(--header-one-search-result-text-color);
                }

                .header-one-middle-section .suggestions a:hover,
                .header-one-middle-section .suggestions a:focus,
                .header-one-middle-section .suggestions .text-primary {
                    color: var(--header-one-search-result-hover-color) !important;
                }

                .header-one-middle-section .option-dropdown__toggler {
                    background-color: transparent;
                }

                .header-one-middle-section .header-one-middle-social-link {
                    color: var(--header-one-middle-text-color) !important;
                }
            `}</style>
      <div className="container flex flex-wrap items-center justify-between gap-x-8 gap-y-2 sm:gap-x-[50px]">
        <div className="flex w-full items-center gap-4 md:w-auto lg:gap-14">
          <button
            className="inline-flex size-11 shrink-0 items-center justify-center text-xl lg:hidden"
            onClick={() => dispatch(togglePopup("categories"))}
            style={{ color: middleTextColor }}
            aria-label="Open product menu"
          >
            <FaBars />
          </button>

          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center justify-center md:flex-none md:justify-start"
            aria-label="Silver Studio home"
          >
            <DynamicLogo
              alt="Silver Studio"
              className="!max-h-[56px] !max-w-[190px] sm:!max-w-[220px] md:!max-h-[60px]"
            />
          </Link>

          <span className="size-11 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        <div className="grow max-w-[618px] max-md:hidden">
          <SearchForm
            placeholder="Search for products, brands and categories..."
            searchOnType={false}
            submittableButton={false}
          />
        </div>

        <div className="relative z-[2] w-full pb-1 md:hidden">
          <SearchForm
            placeholder="Search jewelry..."
            searchOnType={false}
            submittableButton={true}
            classNames={{
              input:
                "h-11 rounded-full border-black/20 bg-[#f8f4ef] pl-5 pr-12 text-sm",
              icon: "rounded-full bg-black text-white",
              suggestionWrapper:
                "top-[calc(100%+6px)] max-h-[60vh] overflow-y-auto rounded-xl text-left",
            }}
          />
        </div>

        <div className="hidden lg:flex items-center justify-end gap-7">
          <button
            className="inline-flex flex-col items-center gap-1 relative"
            onClick={handleWishlistClick}
          >
            <span className="text-[32px]" style={{ color: middleTextColor }}>
              <IoHeartOutline />
            </span>
            {(wishlist?.length || 0) > 0 ? (
              <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 h-5 min-w-[20px] flex items-center justify-center px-1 rounded-full bg-secondary text-white text-sm">
                {paddedNumber(wishlist?.length)}
              </span>
            ) : null}
          </button>
          <button
            className="inline-flex flex-col items-center gap-1 relative"
            onClick={() => dispatch(togglePopup("cart"))}
          >
            <span className="text-[32px]" style={{ color: middleTextColor }}>
              <IoCartOutline />
            </span>
            {totalProductInCart > 0 ? (
              <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 h-5 min-w-[20px] flex items-center justify-center px-1 rounded-full bg-secondary text-white text-sm">
                {paddedNumber(totalProductInCart)}
              </span>
            ) : null}
          </button>

          {showCustomerMenu ? (
            user ? (
              <div className="option-dropdown" tabIndex={0}>
                <div className="option-dropdown__toggler no-style no-arrow p-0 h-auto flex flex-col items-center gap-1 text-inherit min-w-0">
                  <span
                    className="text-[32px]"
                    style={{ color: middleTextColor }}
                  >
                    <FaCircleUser />
                  </span>
                </div>

                <div className="option-dropdown__options shadow-md w-[170px] top-[calc(100%+20px)] left-auto right-0 rounded-none p-0">
                  <AvatarDropdownMenu />
                </div>
              </div>
            ) : (
              <button
                onClick={() => dispatch(togglePopup("signin"))}
                className="inline-flex flex-col items-center gap-1"
              >
                <span
                  className="text-[32px]"
                  style={{ color: middleTextColor }}
                >
                  <FaRegUserCircle />
                </span>
              </button>
            )
          ) : (
            <HeaderSocialLinks linkClassName="header-one-middle-social-link" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Logobar;
