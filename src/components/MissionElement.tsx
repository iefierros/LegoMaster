import { useRef, useEffect, useState, useCallback } from 'react';
import { useBox, useCylinder, useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import type { MissionElement as MissionElementType } from '@/types';

interface MissionElementProps {
  element: MissionElementType;
  onTriggered?: (elementId: string, state: 'triggered' | 'completed') => void;
  showDebug?: boolean;
}

/**
 * Mission element component with physics collision
 * Supports various interaction types: lever, button, gate, cargo, zone
 */
export function MissionElement({
  element,
  onTriggered,
  showDebug = false
}: MissionElementProps) {

  const [elementState, setElementState] = useState<'inactive' | 'triggered' | 'completed'>(element.state);
  const triggeredRef = useRef(false);

  // Handle collision with robot
  const handleCollision = useCallback((event: { body: any }) => {
    if (triggeredRef.current) return;

    const otherBody = event.body;

    // Check if colliding body is the robot
    if (otherBody?.userData?.isRobot) {
      triggeredRef.current = true;
      setElementState('triggered');

      console.log(`🎯 Mission element triggered: ${element.name} (${element.type})`);

      // Call trigger callback
      element.triggers.onCollision?.(otherBody.userData);

      // Notify parent
      onTriggered?.(element.id, 'triggered');

      // For some types, complete immediately
      if (element.type === 'button' || element.type === 'zone') {
        setTimeout(() => {
          setElementState('completed');
          onTriggered?.(element.id, 'completed');
        }, 500);
      }
    }
  }, [element, onTriggered]);

  // Choose physics body based on element type
  switch (element.type) {
    case 'lever':
      return (
        <LeverElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
    case 'button':
      return (
        <ButtonElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
    case 'gate':
      return (
        <GateElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
    case 'cargo':
      return (
        <CargoElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
    case 'zone':
      return (
        <ZoneElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
    default:
      return (
        <GenericElement
          element={element}
          state={elementState}
          onCollision={handleCollision}
          showDebug={showDebug}
        />
      );
  }
}

interface ElementComponentProps {
  element: MissionElementType;
  state: 'inactive' | 'triggered' | 'completed';
  onCollision: (event: { body: any }) => void;
  showDebug?: boolean;
}

/**
 * Lever element - can be pushed to activate
 */
function LeverElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    args: [0.05, 0.1, 0.02],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0.05, // Light, movable
    material: { friction: 0.5, restitution: 0.2 },
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#ff6600' : state === 'triggered' ? '#ffcc00' : '#00ff00';

  return (
    <mesh ref={ref} castShadow>
      {element.mesh ? (
        <primitive object={element.mesh.clone()} />
      ) : (
        <>
          <boxGeometry args={[0.05, 0.1, 0.02]} />
          <meshStandardMaterial color={color} />
        </>
      )}
      {showDebug && (
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.01]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </mesh>
  );
}

/**
 * Button element - activates on pressure
 */
function ButtonElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [ref] = useCylinder<THREE.Mesh>(() => ({
    args: [0.03, 0.03, 0.02, 16],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0, // Static button
    material: { friction: 0.8, restitution: 0.1 },
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#ff0000' : state === 'triggered' ? '#ffcc00' : '#00ff00';

  return (
    <mesh ref={ref} castShadow>
      {element.mesh ? (
        <primitive object={element.mesh.clone()} />
      ) : (
        <>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color={color} />
        </>
      )}
    </mesh>
  );
}

/**
 * Gate element - opens when triggered
 */
function GateElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (state === 'triggered' || state === 'completed') {
      // Animate gate opening
      const interval = setInterval(() => {
        setRotation(r => {
          if (r >= Math.PI / 2) {
            clearInterval(interval);
            return Math.PI / 2;
          }
          return r + 0.05;
        });
      }, 16);
      return () => clearInterval(interval);
    }
  }, [state]);

  const [ref] = useBox<THREE.Group>(() => ({
    args: [0.1, 0.1, 0.02],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0,
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#0066ff' : state === 'triggered' ? '#00ccff' : '#00ff00';

  return (
    <group ref={ref} rotation={[0, rotation, 0]}>
      {element.mesh ? (
        <primitive object={element.mesh.clone()} />
      ) : (
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.1, 0.02]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Cargo element - movable object
 */
function CargoElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    args: [0.04, 0.04, 0.04],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0.02, // Light cargo
    material: { friction: 0.6, restitution: 0.2 },
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#9900ff' : state === 'triggered' ? '#cc66ff' : '#00ff00';

  return (
    <mesh ref={ref} castShadow>
      {element.mesh ? (
        <primitive object={element.mesh.clone()} />
      ) : (
        <>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial color={color} />
        </>
      )}
    </mesh>
  );
}

/**
 * Zone element - trigger area (no visual)
 */
function ZoneElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    args: [0.15, 0.01, 0.15],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0,
    isTrigger: true, // Sensor only, no physics response
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#00ffcc' : state === 'triggered' ? '#66ffcc' : '#00ff00';

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.15, 0.01, 0.15]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={showDebug ? 0.3 : 0}
      />
    </mesh>
  );
}

/**
 * Generic element - fallback for unknown types
 */
function GenericElement({ element, state, onCollision, showDebug }: ElementComponentProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    args: [0.05, 0.05, 0.05],
    position: [element.position.x, element.position.y, element.position.z],
    mass: 0,
    userData: {
      isMissionElement: true,
      elementId: element.id,
      elementType: element.type
    },
    onCollide: onCollision
  }));

  const color = state === 'inactive' ? '#888888' : state === 'triggered' ? '#aaaaaa' : '#00ff00';

  return (
    <mesh ref={ref} castShadow>
      {element.mesh ? (
        <primitive object={element.mesh.clone()} />
      ) : (
        <>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color={color} />
        </>
      )}
    </mesh>
  );
}

/**
 * Mission elements container - renders all mission elements
 */
export function MissionElements({
  elements,
  onElementTriggered,
  showDebug = false
}: {
  elements: MissionElementType[];
  onElementTriggered?: (elementId: string, state: 'triggered' | 'completed') => void;
  showDebug?: boolean;
}) {
  return (
    <>
      {elements.map(element => (
        <MissionElement
          key={element.id}
          element={element}
          onTriggered={onElementTriggered}
          showDebug={showDebug}
        />
      ))}
    </>
  );
}
