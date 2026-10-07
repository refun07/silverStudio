import {
  FaBars,
  FaHome,
  FaShoppingCart,
  FaStore,
  FaUser,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../../store/features/auth/authSlice";
import {
  closePopup,
  togglePopup,
  usePopup,
} from "../../../../store/features/popup/popupSlice";
import { useAppDispatch } from "../../../../store/store";
import { cn } from "../../../../utils/cn";

const BottomBar = () => {
  const { user, carts } = useAuth();
  const { popup } = usePopup();
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();

  const handleCartClick = () => {
    if (popup === "cart") {
      dispatch(closePopup());
    } else {
      dispatch(togglePopup("cart"));
    }
  };

  const getItemClassName = (active?: boolean) => {
    return cn(
      `relative flex min-h-[64px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 border-t-2 px-1 py-2 transition-colors`,
      {
        "border-black text-black": active,
        "border-transparent text-zinc-500 hover:text-black": !active,
      }
    );
  };

  const totalProductInCart = carts.reduce((total, item) => {
    return total + item.qty;
  }, 0);

  const openCategories = () => {
    dispatch(togglePopup("categories"));
  };

  const shopPath =
    window.config.generalSettings.appMode === "multiVendor"
      ? "/shops"
      : "/products";

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[4] flex items-stretch justify-evenly border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur lg:hidden"
      )}
      aria-label="Mobile navigation"
    >
      <Link to="/" className={getItemClassName(pathname === "/")}>
        <span className="text-lg">
          <FaHome />
        </span>
        <span className="text-[10px] font-medium">Home</span>
      </Link>

      <Link
        to={shopPath}
        className={getItemClassName(
          pathname === shopPath || pathname.startsWith("/product-category")
        )}
      >
        <span className="text-lg">
          <FaStore />
        </span>
        <span className="text-[10px] font-medium">Shop</span>
      </Link>

      <button
        className={getItemClassName(popup === "cart")}
        onClick={handleCartClick}
        aria-label={`Open cart with ${totalProductInCart} items`}
      >
        <span className="relative text-lg">
          <FaShoppingCart />
          {totalProductInCart > 0 ? (
            <span className="absolute -right-3 -top-2 inline-flex min-w-[17px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-semibold leading-[17px] text-white">
              {totalProductInCart > 9 ? "9+" : totalProductInCart}
            </span>
          ) : null}
        </span>
        <span className="text-[10px] font-medium">Cart</span>
      </button>

      {user ? (
        <button
          onClick={() => dispatch(togglePopup("dashboard-sidebar"))}
          className={getItemClassName(popup === "dashboard-sidebar")}
        >
          <span className="text-lg">
            <FaUser />
          </span>
          <span className="text-[10px] font-medium">Account</span>
        </button>
      ) : (
        <button
          className={getItemClassName(popup === "signin")}
          onClick={() => dispatch(togglePopup("signin"))}
        >
          <span className="text-lg">
            <FaUser />
          </span>
          <span className="text-[10px] font-medium">Login</span>
        </button>
      )}

      <button
        className={getItemClassName(popup === "categories")}
        onClick={openCategories}
        aria-label="Open product menu"
      >
        <span className="text-lg">
          <FaBars />
        </span>
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </nav>
  );
};

export default BottomBar;
