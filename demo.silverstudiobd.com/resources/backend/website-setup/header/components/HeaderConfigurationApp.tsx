import React, { useState, useEffect } from 'react';
import { Toast } from '../../theme/components/Toast';
import useToast from '../../theme/hooks/useToast';
import ColorPicker from './ColorPicker';

interface CustomLink {
  id: number;
  name: string;
  link: string;
  icon: string;
  iconSvg: string;
}

interface HeaderSocialLink {
    id: number;
    enabled: boolean;
    platform: string;
    url: string;
}

interface HeaderConfigurationAppProps {
    headerId: string;
    apiPrefix: string;
}

const socialPlatforms = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'x', label: 'X / Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'snapchat', label: 'Snapchat' },
];

const HeaderConfigurationApp: React.FC<HeaderConfigurationAppProps> = ({
    headerId,
    apiPrefix,
}) => {
    const [showTopBar, setShowTopBar] = useState(true);
    const [showCustomLinks, setShowCustomLinks] = useState(true);
    const [hotline, setHotline] = useState("Our Hotline +88 01961 177726");
    const [promoText, setPromoText] = useState("FREE delivery & 40% Discount for next 3 orders! Place your 1st order!");
    const [promoTextIcon, setPromoTextIcon] = useState("");
    const [backgroundColor, setBackgroundColor] = useState("#22c55e");
    const [textColor, setTextColor] = useState("#ffffff");
    const [middleBackgroundColor, setMiddleBackgroundColor] = useState("#ffffff");
    const [middleTextColor, setMiddleTextColor] = useState("#5D7261");
    const [searchInputBackgroundColor, setSearchInputBackgroundColor] = useState("#ffffff");
    const [searchInputTextColor, setSearchInputTextColor] = useState("#111827");
    const [searchInputPlaceholderColor, setSearchInputPlaceholderColor] = useState("#6B7280");
    const [searchInputBorderColor, setSearchInputBorderColor] = useState("#5D7261");
    const [searchInputIconColor, setSearchInputIconColor] = useState("#5D7261");
    const [searchResultBackgroundColor, setSearchResultBackgroundColor] = useState("#ffffff");
    const [searchResultTextColor, setSearchResultTextColor] = useState("#111827");
    const [searchResultCategoryBackgroundColor, setSearchResultCategoryBackgroundColor] = useState("#E5E7EB");
    const [searchResultCategoryTextColor, setSearchResultCategoryTextColor] = useState("#111827");
    const [searchResultHoverColor, setSearchResultHoverColor] = useState("#5D7261");
    const [showSearchResultProducts, setShowSearchResultProducts] = useState(true);
    const [showSearchResultBrands, setShowSearchResultBrands] = useState(true);
    const [showSearchResultShops, setShowSearchResultShops] = useState(true);
    const [searchResultProductPriceColor, setSearchResultProductPriceColor] = useState("#5D7261");
    const [searchResultProductDiscountColor, setSearchResultProductDiscountColor] = useState("#EF4444");
    const [showCustomerMenu, setShowCustomerMenu] = useState(true);
    const [socialLinks, setSocialLinks] = useState<HeaderSocialLink[]>([]);
    const [menuFontSize, setMenuFontSize] = useState(14);
    const [menuFontWeight, setMenuFontWeight] = useState("500");
    const [menuTextColor, setMenuTextColor] = useState("#FFFFFF");
    const [menuActiveBorderColor, setMenuActiveBorderColor] = useState("#FFFFFF");
    const [menuActiveBorderWidth, setMenuActiveBorderWidth] = useState(4);
    const [customLinks, setCustomLinks] = useState<CustomLink[]>([
        { id: 1, name: "Campaign", link: "", icon: "cart_icon.png", iconSvg: "" },
        { id: 2, name: "Coupons", link: "", icon: "cart_icon.png", iconSvg: "" },
        { id: 3, name: "Hot Deals", link: "", icon: "cart_icon.png", iconSvg: "" },
    ]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toasts, removeToast, success, error } = useToast();

    // Load configuration
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch(`${apiPrefix}/header/${headerId}/config`);
                const result = await response.json();

                if (result.success) {
                    setShowTopBar(Boolean(result.data.topbar.enabled));
                    setHotline(result.data.topbar.hotline_number || "Our Hotline +88 01961 177726");
                    setPromoTextIcon(result.data.topbar.promo_text_icon || "");
                    setPromoText(result.data.topbar.promo_text || "FREE delivery & 40% Discount for next 3 orders! Place your 1st order!");
                    setBackgroundColor(result.data.topbar.bg_color || "#22c55e");
                    setTextColor(result.data.topbar.text_color || "#ffffff");
                    setMiddleBackgroundColor(result.data.middle_section?.bg_color || "#ffffff");
                    setMiddleTextColor(result.data.middle_section?.text_color || "#5D7261");
                    setSearchInputBackgroundColor(result.data.middle_section?.search_input_bg_color || "#ffffff");
                    setSearchInputTextColor(result.data.middle_section?.search_input_text_color || "#111827");
                    setSearchInputPlaceholderColor(result.data.middle_section?.search_input_placeholder_color || "#6B7280");
                    setSearchInputBorderColor(result.data.middle_section?.search_input_border_color || "#5D7261");
                    setSearchInputIconColor(result.data.middle_section?.search_input_icon_color || "#5D7261");
                    setSearchResultBackgroundColor(result.data.middle_section?.search_result_bg_color || "#ffffff");
                    setSearchResultTextColor(result.data.middle_section?.search_result_text_color || "#111827");
                    setSearchResultCategoryBackgroundColor(result.data.middle_section?.search_result_category_bg_color || "#E5E7EB");
                    setSearchResultCategoryTextColor(result.data.middle_section?.search_result_category_text_color || "#111827");
                    setSearchResultHoverColor(result.data.middle_section?.search_result_hover_color || "#5D7261");
                    setShowSearchResultProducts(result.data.middle_section?.search_result_show_products ?? true);
                    setShowSearchResultBrands(result.data.middle_section?.search_result_show_brands ?? true);
                    setShowSearchResultShops(result.data.middle_section?.search_result_show_shops ?? true);
                    setSearchResultProductPriceColor(result.data.middle_section?.search_result_product_price_color || "#5D7261");
                    setSearchResultProductDiscountColor(result.data.middle_section?.search_result_product_discount_color || "#EF4444");
                    setShowCustomerMenu(result.data.middle_section?.customer_menu_enabled ?? true);
                    setSocialLinks(Array.isArray(result.data.middle_section?.social_links)
                        ? result.data.middle_section.social_links.map((link: any, index: number) => ({
                            id: index + 1,
                            enabled: link.enabled !== '0' && link.enabled !== false,
                            platform: link.platform || 'facebook',
                            url: link.url || '',
                        }))
                        : []
                    );
                    setShowCustomLinks(Boolean(result.data.navbar.custom_links_enabled));
                    setMenuFontSize(result.data.navbar.menu_style?.font_size || 14);
                    setMenuFontWeight(result.data.navbar.menu_style?.font_weight || "500");
                    setMenuTextColor(result.data.navbar.menu_style?.text_color || "#FFFFFF");
                    setMenuActiveBorderColor(result.data.navbar.menu_style?.active_border_color || "#FFFFFF");
                    setMenuActiveBorderWidth(result.data.navbar.menu_style?.active_border_width || 4);

                    if (result.data.navbar.custom_links.length > 0) {
                        setCustomLinks(result.data.navbar.custom_links.map((link: any, index: number) => ({
                            id: index + 1,
                            name: link.name,
                            link: link.url,
                            icon: link.icon_path,
                            iconSvg: link.icon_svg || ''
                        })));
                    }
                } else {
                    error('Failed to load header configuration');
                }
            } catch (err) {
                error('Error loading header configuration');
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [headerId, apiPrefix]);

    const addNewLink = () => {
        const newId = customLinks.length > 0 ? Math.max(...customLinks.map((l) => l.id)) + 1 : 1;
        setCustomLinks([...customLinks, { id: newId, name: "", link: "", icon: "", iconSvg: "" }]);
    };

    const handlePromoTextIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('icon', file);

        try {
            const response = await fetch(`${apiPrefix}/upload-icon`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setPromoTextIcon(result.data.file_path);
            } else {
                error(result.message || 'Failed to upload icon');
            }
        } catch (err) {
            error('Error uploading icon');
        }
    };

    const handleLinkIconUpload = async (event: React.ChangeEvent<HTMLInputElement>, linkId: number) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('icon', file);

        try {
            const response = await fetch(`${apiPrefix}/upload-icon`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                updateLink(linkId, 'icon', result.data.file_path);
            } else {
                error(result.message || 'Failed to upload icon');
            }
        } catch (err) {
            error('Error uploading icon');
        }
    };

    const removeLink = (id: number) => {
        setCustomLinks(customLinks.filter((link) => link.id !== id));
    };

    const updateLink = (id: number, field: string, value: string) => {
        setCustomLinks(customLinks.map((link) => (link.id === id ? { ...link, [field]: value } : link)));
    };

    const addSocialLink = () => {
        const newId = socialLinks.length > 0 ? Math.max(...socialLinks.map((link) => link.id)) + 1 : 1;
        setSocialLinks([...socialLinks, { id: newId, enabled: true, platform: 'facebook', url: '' }]);
    };

    const removeSocialLink = (id: number) => {
        setSocialLinks(socialLinks.filter((link) => link.id !== id));
    };

    const updateSocialLink = (id: number, field: keyof HeaderSocialLink, value: string | boolean) => {
        setSocialLinks(socialLinks.map((link) => (link.id === id ? { ...link, [field]: value } : link)));
    };

    // Save configuration
    const handleSave = async () => {
        setSaving(true);
        try {
            const config = {
                topbar: {
                    enabled: Boolean(showTopBar),
                    hotline_number: hotline,
                    promo_text_icon: promoTextIcon,
                    promo_text: promoText,
                    bg_color: backgroundColor,
                    text_color: textColor
                },
                middle_section: {
                    bg_color: middleBackgroundColor,
                    text_color: middleTextColor,
                    search_input_bg_color: searchInputBackgroundColor,
                    search_input_text_color: searchInputTextColor,
                    search_input_placeholder_color: searchInputPlaceholderColor,
                    search_input_border_color: searchInputBorderColor,
                    search_input_icon_color: searchInputIconColor,
                    search_result_bg_color: searchResultBackgroundColor,
                    search_result_text_color: searchResultTextColor,
                    search_result_category_bg_color: searchResultCategoryBackgroundColor,
                    search_result_category_text_color: searchResultCategoryTextColor,
                    search_result_hover_color: searchResultHoverColor,
                    search_result_show_products: Boolean(showSearchResultProducts),
                    search_result_show_brands: Boolean(showSearchResultBrands),
                    search_result_show_shops: Boolean(showSearchResultShops),
                    search_result_product_price_color: searchResultProductPriceColor,
                    search_result_product_discount_color: searchResultProductDiscountColor,
                    customer_menu_enabled: Boolean(showCustomerMenu),
                    social_links: socialLinks.map(link => ({
                        enabled: Boolean(link.enabled),
                        platform: link.platform,
                        url: link.url
                    }))
                },
                navbar: {
                    custom_links_enabled: Boolean(showCustomLinks),
                    custom_links: customLinks.map(link => ({
                        name: link.name,
                        url: link.link,
                        icon_path: link.icon,
                        icon_svg: link.iconSvg
                    })),
                    menu_style: {
                        font_size: menuFontSize,
                        font_weight: menuFontWeight,
                        text_color: menuTextColor,
                        active_border_color: menuActiveBorderColor,
                        active_border_width: menuActiveBorderWidth
                    }
                }
            };

            const response = await fetch(`${apiPrefix}/header/${headerId}/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (result.success) {
                success('Header configuration saved successfully');
            } else {
                error(result.message || 'Failed to save configuration');
            }
        } catch (err) {
            error('Error saving header configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <div className="">
                {/* Main Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                    {/* Menu 1 Edit Header */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-medium text-[#1a1a2e]">Menu 1 Edit {headerId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
                    </div>

                    <div className="p-6">
                        {/* Different configuration based on header type */}
                        {headerId === 'header-one' && (
                            <>
                                {/* Top Bar Section */}
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Top Bar</h3>
                                </div>

                                {/* Top Bar Settings */}
                                <div className="space-y-6 mb-8">
                                    {/* Show/Hide Top Bar */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Show/Hide Top Bar
                                        </label>
                                        <Toggle enabled={showTopBar} onChange={setShowTopBar} />
                                    </div>

                                    {/* Hotline */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Hotline (Full Line)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="text"
                                                value={hotline}
                                                onChange={(e) => setHotline(e.target.value)}
                                                placeholder="Our Hotline +88 01961 177726"
                                                className="w-80 px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                            />
                                            <span className="text-sm text-gray-500">Icon</span>
                                            <div>
                                            <div className="flex items-center">
                                                <label className="px-6 py-2.5 bg-[#4f5bd5] text-white text-sm font-medium rounded-l-md hover:bg-[#4450c0] cursor-pointer">
                                                    Browse
                                                    <input
                                                        type="file"
                                                        accept=".png,.svg,.jpg,.jpeg"
                                                        onChange={handlePromoTextIconUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={promoTextIcon}
                                                    placeholder="Select File (png or svg)"
                                                    className="w-48 px-4 py-2.5 border border-gray-200 border-l-0 rounded-r-md text-sm text-gray-400 focus:outline-none"
                                                    readOnly
                                                />
                                            </div>
                                            <div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Recommended: 32x32 pixels
                                    </p>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Top Bar Promo Text */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Top Bar Promo Text
                                        </label>
                                        <input
                                            type="text"
                                            value={promoText}
                                            onChange={(e) => setPromoText(e.target.value)}
                                            className="flex-1 max-w-2xl px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                        />
                                    </div>

                                    {/* Background Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={backgroundColor}
                                            onChange={setBackgroundColor}
                                            label="Background Color"
                                        />
                                    </div>

                                    {/* Text Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={textColor}
                                            onChange={setTextColor}
                                            label="Text Color"
                                        />
                                    </div>
                                </div>

                                {/* Middle Section */}
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Middle Section</h3>
                                </div>

                                <div className="space-y-6 mb-8">
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={middleBackgroundColor}
                                            onChange={setMiddleBackgroundColor}
                                            label="Background Color"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={middleTextColor}
                                            onChange={setMiddleTextColor}
                                            label="Text / Icon / Search Border Color"
                                        />
                                    </div>

                                    <div className="border-t border-gray-200 pt-6">
                                        <h4 className="text-sm font-semibold text-[#1a1a2e] mb-4">
                                            Search Box
                                        </h4>
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            <ColorPicker
                                                value={searchInputBackgroundColor}
                                                onChange={setSearchInputBackgroundColor}
                                                label="Search Box Background Color"
                                            />

                                            <ColorPicker
                                                value={searchInputTextColor}
                                                onChange={setSearchInputTextColor}
                                                label="Search Box Text Color"
                                            />

                                            <ColorPicker
                                                value={searchInputPlaceholderColor}
                                                onChange={setSearchInputPlaceholderColor}
                                                label="Search Box Placeholder Color"
                                            />

                                            <ColorPicker
                                                value={searchInputBorderColor}
                                                onChange={setSearchInputBorderColor}
                                                label="Search Box Border Color"
                                            />

                                            <ColorPicker
                                                value={searchInputIconColor}
                                                onChange={setSearchInputIconColor}
                                                label="Search Icon Color"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-6">
                                        <h4 className="text-sm font-semibold text-[#1a1a2e] mb-4">
                                            Search Results
                                        </h4>
                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center">
                                                <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                                    Show Products
                                                </label>
                                                <Toggle enabled={showSearchResultProducts} onChange={setShowSearchResultProducts} />
                                            </div>

                                            <div className="flex items-center">
                                                <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                                    Show Brands
                                                </label>
                                                <Toggle enabled={showSearchResultBrands} onChange={setShowSearchResultBrands} />
                                            </div>

                                            <div className="flex items-center">
                                                <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                                    Show Shops
                                                </label>
                                                <Toggle enabled={showSearchResultShops} onChange={setShowSearchResultShops} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            <ColorPicker
                                                value={searchResultBackgroundColor}
                                                onChange={setSearchResultBackgroundColor}
                                                label="Result Background Color"
                                            />

                                            <ColorPicker
                                                value={searchResultTextColor}
                                                onChange={setSearchResultTextColor}
                                                label="Result Text Color"
                                            />

                                            <ColorPicker
                                                value={searchResultCategoryBackgroundColor}
                                                onChange={setSearchResultCategoryBackgroundColor}
                                                label="Result Category Background Color"
                                            />

                                            <ColorPicker
                                                value={searchResultCategoryTextColor}
                                                onChange={setSearchResultCategoryTextColor}
                                                label="Result Category Text Color"
                                            />

                                            <ColorPicker
                                                value={searchResultHoverColor}
                                                onChange={setSearchResultHoverColor}
                                                label="Result Hover / Match Color"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={searchResultProductPriceColor}
                                            onChange={setSearchResultProductPriceColor}
                                            label="Search Result Product Price Color"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={searchResultProductDiscountColor}
                                            onChange={setSearchResultProductDiscountColor}
                                            label="Search Result Product Discount Color"
                                        />
                                    </div>

                                    <div className="border-t border-gray-200 pt-6">
                                        <div className="flex items-center">
                                            <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                                Show Customer Login Menu
                                            </label>
                                            <Toggle enabled={showCustomerMenu} onChange={setShowCustomerMenu} />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-[#1a1a2e]">
                                                Social Icons When Customer Menu Is Hidden
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Enable social links to show icons in place of the customer login menu.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {socialLinks.map((link, index) => (
                                                <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <label className="text-sm font-semibold text-[#1a1a2e]">
                                                            Social Link {index + 1}
                                                        </label>
                                                        <button
                                                            onClick={() => removeSocialLink(link.id)}
                                                            className="p-2 text-red-500 hover:text-red-600"
                                                            type="button"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center mb-4">
                                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                                            Enable This Icon
                                                        </label>
                                                        <Toggle
                                                            enabled={link.enabled}
                                                            onChange={(value) => updateSocialLink(link.id, 'enabled', value)}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-[#6b7280] mb-1 uppercase tracking-wide">
                                                                Social Media
                                                            </label>
                                                            <select
                                                                value={link.platform}
                                                                onChange={(e) => updateSocialLink(link.id, 'platform', e.target.value)}
                                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                            >
                                                                {socialPlatforms.map((platform) => (
                                                                    <option key={platform.value} value={platform.value}>
                                                                        {platform.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-[#6b7280] mb-1 uppercase tracking-wide">
                                                                Social Link
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={link.url}
                                                                onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                                placeholder="https://www.example.com"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                onClick={addSocialLink}
                                                type="button"
                                                className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white text-sm font-medium rounded-md hover:bg-[#0f766e]"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                ADD SOCIAL LINK
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {headerId === 'header-two' && (
                            <>
                                {/* Header Two Section */}
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Header Two Configuration</h3>
                                </div>

                                {/* Header Two Settings */}
                                <div className="space-y-6 mb-8">
                                    {/* Show/Hide Campaigns Button */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Show/Hide Campaigns Button
                                        </label>
                                        <Toggle enabled={showTopBar} onChange={setShowTopBar} />
                                    </div>

                                    {/* Header Background Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={backgroundColor}
                                            onChange={setBackgroundColor}
                                            label="Header Background Color"
                                        />
                                    </div>

                                    {/* Header Text Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={textColor}
                                            onChange={setTextColor}
                                            label="Header Text Color"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {headerId === 'header-three' && (
                            <>
                                {/* Top Bar Section */}
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Top Bar</h3>
                                </div>

                                {/* Top Bar Settings */}
                                <div className="space-y-6 mb-8">
                                    {/* Show/Hide Top Bar */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Show/Hide Top Bar
                                        </label>
                                        <Toggle enabled={showTopBar} onChange={setShowTopBar} />
                                    </div>

                                    {/* Hotline */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Hotline (Full Line)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="text"
                                                value={hotline}
                                                onChange={(e) => setHotline(e.target.value)}
                                                placeholder="Our Hotline +88 01961 177726"
                                                className="w-80 px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                            />
                                            <span className="text-sm text-gray-500">Icon</span>
                                            <div className="flex items-center">
                                                <label className="px-6 py-2.5 bg-[#4f5bd5] text-white text-sm font-medium rounded-l-md hover:bg-[#4450c0] cursor-pointer">
                                                    Browse
                                                    <input
                                                        type="file"
                                                        accept=".png,.svg,.jpg,.jpeg"
                                                        onChange={handlePromoTextIconUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={promoTextIcon}
                                                    placeholder="Select File (png or svg)"
                                                    className="w-48 px-4 py-2.5 border border-gray-200 border-l-0 rounded-r-md text-sm text-gray-400 focus:outline-none"
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 ml-56 mt-1">
                                        Recommended: 32x32 pixels
                                    </p>

                                    {/* Top Bar Promo Text */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Top Bar Promo Text
                                        </label>
                                        <input
                                            type="text"
                                            value={promoText}
                                            onChange={(e) => setPromoText(e.target.value)}
                                            className="flex-1 max-w-2xl px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                        />
                                    </div>

                                    {/* Background Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={backgroundColor}
                                            onChange={setBackgroundColor}
                                            label="Background Color"
                                        />
                                    </div>

                                    {/* Text Color */}
                                    <div className="flex items-center">
                                        <ColorPicker
                                            value={textColor}
                                            onChange={setTextColor}
                                            label="Text Color"
                                        />
                                    </div>
                                </div>

                                {/* Nav Bar Section */}
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Nav Bar</h3>
                                </div>

                                {/* Nav Bar Settings */}
                                <div className="space-y-6">
                                    {/* Show/Hide Custom Links */}
                                    <div className="flex items-center">
                                        <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                            Show/Hide Custom
                                            <br />
                                            Links
                                        </label>
                                        <Toggle enabled={showCustomLinks} onChange={setShowCustomLinks} />
                                    </div>

                                    {/* Custom Links */}
                                    {customLinks.map((link, index) => (
                                        <div key={link.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-semibold text-[#1a1a2e]">
                                                    Custom Link {index + 1}
                                                </label>
                                                <button
                                                    onClick={() => removeLink(link.id)}
                                                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={link.name}
                                                        onChange={(e) => updateLink(link.id, "name", e.target.value)}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                        placeholder="Link name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6b7280] mb-1">URL</label>
                                                    <input
                                                        type="text"
                                                        value={link.link}
                                                        onChange={(e) => updateLink(link.id, "link", e.target.value)}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                        placeholder="https://example.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Icon Image (PNG/SVG)</label>
                                                    <div className="flex items-center">
                                                        <label className="px-4 py-2.5 bg-[#4f5bd5] text-white text-sm font-medium rounded-l-md hover:bg-[#4450c0] cursor-pointer">
                                                            Browse
                                                            <input
                                                                type="file"
                                                                accept=".png,.svg,.jpg,.jpeg"
                                                                onChange={(e) => handleLinkIconUpload(e, link.id)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={link.icon || 'No file selected'}
                                                            placeholder="No file selected"
                                                            className="flex-1 px-4 py-2.5 border border-gray-200 border-l-0 rounded-r-md text-sm text-gray-400 focus:outline-none"
                                                            readOnly
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Recommended: 32x32 pixels
                                                </p>
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Or SVG Code</label>
                                                    <textarea
                                                        value={link.iconSvg}
                                                        onChange={(e) => updateLink(link.id, "iconSvg", e.target.value)}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                        rows={3}
                                                        placeholder="<svg>...</svg>"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Link Button */}
                                    <div className="pt-4">
                                        <button
                                            onClick={addNewLink}
                                            className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white text-sm font-medium rounded-md hover:bg-[#0f766e]"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            ADD NEW LINK
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Nav Bar Section - Only for header-one */}
                        {headerId === 'header-one' && (
                            <>
                                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Nav Bar</h3>
                                </div>

                                {/* Nav Bar Settings */}
                                <div className="space-y-6">
                            {/* Menu Text Style */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-[#6b7280] mb-1 uppercase tracking-wide">
                                        Menu Font Size
                                    </label>
                                    <input
                                        type="number"
                                        min={10}
                                        max={32}
                                        value={menuFontSize}
                                        onChange={(e) => setMenuFontSize(Number(e.target.value) || 14)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#6b7280] mb-1 uppercase tracking-wide">
                                        Menu Font Weight
                                    </label>
                                    <select
                                        value={menuFontWeight}
                                        onChange={(e) => setMenuFontWeight(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                    >
                                        <option value="300">Light</option>
                                        <option value="400">Normal</option>
                                        <option value="500">Medium</option>
                                        <option value="600">Semi Bold</option>
                                        <option value="700">Bold</option>
                                        <option value="800">Extra Bold</option>
                                        <option value="900">Bolder</option>
                                    </select>
                                </div>

                                <ColorPicker
                                    value={menuTextColor}
                                    onChange={setMenuTextColor}
                                    label="Menu Text Color"
                                />

                                <ColorPicker
                                    value={menuActiveBorderColor}
                                    onChange={setMenuActiveBorderColor}
                                    label="Active Bottom Border Color"
                                />

                                <div>
                                    <label className="block text-xs font-medium text-[#6b7280] mb-1 uppercase tracking-wide">
                                        Active Bottom Border Weight (Max 40)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={40}
                                        value={menuActiveBorderWidth}
                                        onChange={(e) => setMenuActiveBorderWidth(Number(e.target.value) || 4)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                    />
                                </div>
                            </div>

                            {/* Show/Hide Custom Links */}
                            <div className="flex items-center">
                                <label className="w-56 text-xs font-medium text-[#6b7280] uppercase tracking-wide">
                                    Show/Hide Custom
                                    <br />
                                    Links
                                </label>
                                <Toggle enabled={showCustomLinks} onChange={setShowCustomLinks} />
                            </div>

                            {/* Custom Links */}
                            {customLinks.map((link, index) => (
                                <div key={link.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-semibold text-[#1a1a2e]">
                                            Custom Link {index + 1}
                                        </label>
                                        <button onClick={() => removeLink(link.id)} className="p-2 text-red-500 hover:text-red-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#6b7280] mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={link.name}
                                                onChange={(e) => updateLink(link.id, "name", e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                placeholder="Link name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6b7280] mb-1">URL</label>
                                            <input
                                                type="text"
                                                value={link.link}
                                                onChange={(e) => updateLink(link.id, "link", e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6b7280] mb-1">Icon Image (PNG/SVG)</label>
                                            <div className="flex items-center">
                                                <label className="px-4 py-2.5 bg-[#4f5bd5] text-white text-sm font-medium rounded-l-md hover:bg-[#4450c0] cursor-pointer">
                                                    Browse
                                                    <input
                                                        type="file"
                                                        accept=".png,.svg,.jpg,.jpeg"
                                                        onChange={(e) => handleLinkIconUpload(e, link.id)}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={link.icon}
                                                    placeholder="No file selected"
                                                    className="flex-1 px-4 py-2.5 border border-gray-200 border-l-0 rounded-r-md text-sm text-gray-400 focus:outline-none"
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Recommended: 32x32 pixels
                                        </p>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6b7280] mb-1">Or SVG Code</label>
                                            <textarea
                                                value={link.iconSvg}
                                                onChange={(e) => updateLink(link.id, "iconSvg", e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:border-gray-300"
                                                rows={3}
                                                placeholder="<svg>...</svg>"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Link Button */}
                            <div className="pt-4">
                                <button
                                    onClick={addNewLink}
                                    className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white text-sm font-medium rounded-md hover:bg-[#0f766e]"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    ADD NEW LINK
                                </button>
                            </div>
                                </div>
                            </>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-200 mt-8 pt-6">
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-3 bg-[#4f5bd5] text-white text-sm font-medium rounded-md hover:bg-[#4450c0] uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Settings'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
    );
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-[#22c55e]" : "bg-gray-300"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-0"
                }`}
            />
        </button>
    );
}

const ToastContainer: React.FC<{ toasts: any[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-md shadow-lg transform transition-all duration-300 ${
                        toast.type === 'success'
                            ? 'bg-blue-500 text-white'
                            : toast.type === 'error'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-600 text-white'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' ? (
                            <i className="fa fa-check-circle"></i>
                        ) : toast.type === 'error' ? (
                            <i className="fa fa-exclamation-circle"></i>
                        ) : (
                            <i className="fa fa-info-circle"></i>
                        )}
                        <span>{toast.message}</span>
                    </div>
                    <button
                        onClick={() => onRemove(toast.id)}
                        className="ml-4 hover:opacity-75 transition-opacity"
                    >
                        <i className="fa fa-times"></i>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default HeaderConfigurationApp;
