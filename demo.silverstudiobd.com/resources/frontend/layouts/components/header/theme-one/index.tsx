import BottomBar from './BottomBar';
import CategoryBar from './CategoryBar';
import Logobar from './Logobar';
import TopBar from './TopBar';
import DynamicTopBar from '../DynamicTopBar';
import { useEffect, useState } from 'react';

interface HeaderConfig {
    topbar: {
        enabled: boolean;
        hotline_number: string;
        promo_text_icon: string;
        promo_text: string;
        bg_color: string;
        text_color: string;
    };
    middle_section: {
        bg_color: string;
        text_color: string;
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
    };
    navbar: {
        custom_links_enabled: boolean;
        custom_links: Array<{
            name: string;
            url: string;
            icon_path: string;
        }>;
        menu_style?: {
            font_size?: number;
            font_weight?: string;
            text_color?: string;
            active_border_color?: string;
            active_border_width?: number;
        };
    };
}

const HeaderThemeOne = () => {
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Use header configuration from window.config (passed from Laravel HomeController)
        const loadHeaderConfig = () => {
            try {
                // Get the header configuration from window.config
                const headerTopbarConfig = window.config.headerTopbarConfig || {};
                const headerMiddleSectionConfig = window.config.headerMiddleSectionConfig || {};
                const headerNavbarConfig = window.config.headerNavbarConfig || {};
                const systemPhone = window.config.generalSettings.systemPhone?.trim();
                const hotlineLabel = systemPhone ? `Our Hotline ${systemPhone}` : window.config.topbarHotlineLabel;

                const config = {
                    topbar: {
                        enabled: headerTopbarConfig.enabled ?? true,
                        hotline_number: hotlineLabel || headerTopbarConfig.hotline_number || window.config.topbarHotline || '+88 0176 229 201',
                        hotline: systemPhone || headerTopbarConfig.hotline || window.config.topbarHotline,
                        promo_text_icon: headerTopbarConfig.promo_text_icon || '',
                        promo_text: headerTopbarConfig.promo_text || window.config.topbarPromoText || 'FREE delivery & 40% Discount for next 3 orders!',
                        bg_color: headerTopbarConfig.bg_color || '#1a1a2e',
                        text_color: headerTopbarConfig.text_color || '#ffffff'
                    },
                    middle_section: {
                        bg_color: headerMiddleSectionConfig.bg_color || '#ffffff',
                        text_color: headerMiddleSectionConfig.text_color || '#5D7261',
                        search_input_bg_color: headerMiddleSectionConfig.search_input_bg_color || '#ffffff',
                        search_input_text_color: headerMiddleSectionConfig.search_input_text_color || '#111827',
                        search_input_placeholder_color: headerMiddleSectionConfig.search_input_placeholder_color || '#6B7280',
                        search_input_border_color: headerMiddleSectionConfig.search_input_border_color || '#5D7261',
                        search_input_icon_color: headerMiddleSectionConfig.search_input_icon_color || '#5D7261',
                        search_result_bg_color: headerMiddleSectionConfig.search_result_bg_color || '#ffffff',
                        search_result_text_color: headerMiddleSectionConfig.search_result_text_color || '#111827',
                        search_result_category_bg_color: headerMiddleSectionConfig.search_result_category_bg_color || '#E5E7EB',
                        search_result_category_text_color: headerMiddleSectionConfig.search_result_category_text_color || '#111827',
                        search_result_hover_color: headerMiddleSectionConfig.search_result_hover_color || '#5D7261',
                    },
                    navbar: {
                        custom_links_enabled: headerNavbarConfig.custom_links_enabled ?? false,
                        custom_links: Array.isArray(headerNavbarConfig.custom_links) ? headerNavbarConfig.custom_links : [],
                        menu_style: headerNavbarConfig.menu_style || undefined,
                    }
                };

                setHeaderConfig(config);
            } catch (error) {
                // Fallback to default configuration (same as original static Topbar)
                setHeaderConfig({
                    topbar: {
                        enabled: true,
                        hotline_number: window.config.generalSettings.systemPhone?.trim()
                            ? `Our Hotline ${window.config.generalSettings.systemPhone.trim()}`
                            : window.config.topbarHotline || '+88 0176 229 201',
                        hotline: window.config.generalSettings.systemPhone?.trim() || window.config.topbarHotline,
                        promo_text_icon: '',
                        promo_text: window.config.topbarPromoText || 'FREE delivery & 40% Discount for next 3 orders!',
                        bg_color: '#1a1a2e',
                        text_color: '#ffffff'
                    },
                    middle_section: {
                        bg_color: '#ffffff',
                        text_color: '#5D7261',
                        search_input_bg_color: '#ffffff',
                        search_input_text_color: '#111827',
                        search_input_placeholder_color: '#6B7280',
                        search_input_border_color: '#5D7261',
                        search_input_icon_color: '#5D7261',
                        search_result_bg_color: '#ffffff',
                        search_result_text_color: '#111827',
                        search_result_category_bg_color: '#E5E7EB',
                        search_result_category_text_color: '#111827',
                        search_result_hover_color: '#5D7261',
                    },
                    navbar: {
                        custom_links_enabled: false,
                        custom_links: []
                    }
                });
            } finally {
                setLoading(false);
            }
        };

        loadHeaderConfig();
    }, []);

    if (loading) {
        return (
            <>
                <TopBar />
                <Logobar middleSectionConfig={headerConfig?.middle_section} />
                <CategoryBar navbarConfig={headerConfig?.navbar} />
                <BottomBar />
            </>
        );
    }

    return (
        <>
            {/* Use DynamicTopBar if configuration is loaded, otherwise fallback to original Topbar */}
            {headerConfig ? (
                <DynamicTopBar config={headerConfig.topbar} />
            ) : (
                <TopBar />
            )}
            <Logobar middleSectionConfig={headerConfig?.middle_section} />
            <CategoryBar navbarConfig={headerConfig?.navbar} />
            <BottomBar />
        </>
    );
};

export default HeaderThemeOne;
