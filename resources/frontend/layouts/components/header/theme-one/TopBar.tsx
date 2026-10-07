import { FaTag } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { translate } from '../../../../utils/translate';

const TopBar = () => {
    const systemPhone = window.config.generalSettings.systemPhone?.trim();
    const hotlineNumber = systemPhone || window.config.topbarHotline;
    const hotlineLabel = systemPhone
        ? `Our Hotline ${systemPhone}`
        : window.config.topbarHotlineLabel ?? 'Our Hotline +88 0176 229 201';

    return (
        <div className="max-lg:hidden bg-primary text-white h-[46px] flex items-center justify-center">
            <div className="container flex justify-between items-center gap-10 text-[17px]">
                <a href={`tel:${hotlineNumber?.replace(/\D/g, '')}`} className="font-medium">
                    <span style={{ color: 'inherit' }}>{translate(hotlineLabel)}</span>
                </a>

                <a href="#" className="flex gap-2 items-center">
                    <span className="text-secondary">
                        <FaTag />
                    </span>
                    <span>
                        {translate(window.config.topbarPromoText)}
                    </span>
                </a>

                <div className="flex items-center justify-center gap-5">
                    <Link to={'/orders/track'} className="">
                        {translate('Track Order')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
