import type { CSSProperties } from "react";
import styles from "./boxes-loader.module.css";

interface BoxesLoaderProps {
  size?: number;
  className?: string;
}

export function BoxesLoader({ size = 32, className }: BoxesLoaderProps) {
  return (
    <div
      className={`${styles.boxes} ${className ?? ""}`}
      style={{ "--size": `${size}px` } as CSSProperties}
    >
      <div className={styles.box}><div /><div /><div /><div /></div>
      <div className={styles.box}><div /><div /><div /><div /></div>
      <div className={styles.box}><div /><div /><div /><div /></div>
      <div className={styles.box}><div /><div /><div /><div /></div>
    </div>
  );
}
