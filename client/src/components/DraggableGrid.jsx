import { useState, useEffect, useRef, createContext, useContext } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

const STORAGE_KEY = 'plugos-dashboard-layout';

// Context to share dragging state with children
const DragContext = createContext({ isDragging: false });
export const useDragContext = () => useContext(DragContext);

// Default layout configuration for each plug type with min/max constraints
const DEFAULT_SIZES = {
  'employee-directory': { w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  'attendance-tracker': { w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  'payroll-manager': { w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  'document-manager': { w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  'education-manager': { w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  'default': { w: 1, h: 2, minW: 1, maxW: 2, minH: 2, maxH: 4 }
};

export default function DraggableGrid({ 
  children, 
  plugs, 
  orgId, 
  userId 
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [cols, setCols] = useState(3);
  const [layout, setLayout] = useState([]);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const storageKey = `${STORAGE_KEY}-${orgId}-${userId}`;

  // Calculate columns based on width
  const calculateCols = (width) => {
    if (width < 640) return 1;
    if (width < 1024) return 2;
    return 3;
  };

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        setCols(calculateCols(width));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Generate default layout for plugs
  const generateDefaultLayout = (plugList, colCount) => {
    return plugList.map((plug, index) => {
      const sizes = DEFAULT_SIZES[plug.slug] || DEFAULT_SIZES['default'];
      const row = Math.floor(index / colCount);
      const col = index % colCount;
      
      return {
        i: plug.id.toString(),
        x: col,
        y: row * 2,
        ...sizes
      };
    });
  };

  // Load or generate layout
  useEffect(() => {
    if (!plugs || plugs.length === 0) {
      setIsLayoutReady(true);
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedLayout = JSON.parse(saved);
        // Validate saved layout against current plugs and merge with default sizes for constraints
        const validLayout = savedLayout
          .filter(item => plugs.some(plug => plug.id.toString() === item.i))
          .map(item => {
            const plug = plugs.find(p => p.id.toString() === item.i);
            const defaultSizes = DEFAULT_SIZES[plug?.slug] || DEFAULT_SIZES['default'];
            return {
              ...item,
              // Ensure min/max constraints are applied
              minW: defaultSizes.minW,
              maxW: defaultSizes.maxW,
              minH: defaultSizes.minH,
              maxH: defaultSizes.maxH
            };
          });
        
        // Add any new plugs not in saved layout
        const existingIds = validLayout.map(item => item.i);
        const newPlugs = plugs.filter(plug => 
          !existingIds.includes(plug.id.toString())
        );
        
        if (newPlugs.length > 0) {
          const newLayout = generateDefaultLayout(newPlugs, cols);
          // Adjust positions for new items
          const maxY = Math.max(...validLayout.map(item => item.y + item.h), 0);
          newLayout.forEach((item, idx) => {
            item.y = maxY + Math.floor(idx / cols) * 2;
            item.x = idx % cols;
          });
          setLayout([...validLayout, ...newLayout]);
        } else {
          setLayout(validLayout);
        }
      } else {
        setLayout(generateDefaultLayout(plugs, cols));
      }
    } catch (e) {
      console.error('Failed to load layout:', e);
      setLayout(generateDefaultLayout(plugs, cols));
    }
    
    setIsLayoutReady(true);
  }, [plugs, cols, storageKey]);

  // Save layout on change
  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch (e) {
      console.error('Failed to save layout:', e);
    }
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag stop - delay reset to prevent click from firing
  const handleDragStop = () => {
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  if (!isLayoutReady || !plugs || plugs.length === 0) {
    return <div ref={containerRef}>{children}</div>;
  }

  return (
    <DragContext.Provider value={{ isDragging }}>
      <div ref={containerRef} className="draggable-grid-container">
        <GridLayout
          className="layout"
          layout={layout}
          cols={cols}
          rowHeight={140}
          width={containerWidth}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          draggableHandle=".drag-handle"
          resizeHandles={['se']}
          margin={[24, 24]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          compactType="vertical"
          preventCollision={false}
          isResizable={true}
          isDraggable={true}
        >
          {children}
        </GridLayout>
      </div>
    </DragContext.Provider>
  );
}

