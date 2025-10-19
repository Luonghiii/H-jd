import React from 'react';
import { useSettings } from '../hooks/useSettings';

const AppBackground: React.FC = () => {
    const { backgroundSetting } = useSettings();

    return (
        <>
            {/* Default animated gradient background. CSS handles dark mode. */}
            <div className="fixed inset-0 -z-20 animated-gradient dark:dark-animated-gradient" />

            {/* Custom user background, overlays the default. */}
            <div
                className="fixed inset-0 -z-10 bg-cover bg-center transition-opacity duration-700"
                style={{
                    opacity: backgroundSetting ? 1 : 0,
                    backgroundImage: backgroundSetting
                        ? backgroundSetting.type === 'image'
                            ? `url(${backgroundSetting.value})`
                            : backgroundSetting.value
                        : 'none',
                }}
            />
        </>
    );
};

export default AppBackground;