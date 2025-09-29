import React, { useState, ReactNode } from 'react';
import { IconChevronRight, IconChevronDown } from '../common/Icon';

interface CollapsibleSectionProps {
    title: string;
    children: ReactNode;
    defaultCollapsed?: boolean;
    headerActions?: ReactNode;
    className?: string;
    onToggle?: (isCollapsed: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultCollapsed = false,
    headerActions,
    className = '',
    onToggle
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const handleToggle = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        onToggle?.(newCollapsed);
    };

    return (
        <div className={`card project-section ${className}`}>
            <div className="project-section-header collapsible-header" onClick={handleToggle}>
                <h3>{title}</h3>
                <div className="header-actions">
                    {headerActions}
                    <div className="collapse-icon">
                        {isCollapsed ? <IconChevronRight /> : <IconChevronDown />}
                    </div>
                </div>
            </div>
            <div className={`project-section-body ${isCollapsed ? 'collapsed' : ''}`}>
                {children}
            </div>
        </div>
    );
};
