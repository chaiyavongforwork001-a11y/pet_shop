"use client";
import { useCallback, useEffect, useMemo } from "react";
import { Modal } from "../ui";

const FILE_NAME = "pawpal-bestie.png";

export function HeroPhotoModal({
  blob,
  close,
}: {
  blob: Blob;
  close: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const file = useMemo(
    () => new File([blob], FILE_NAME, { type: "image/png" }),
    [blob],
  );

  const canShare = useMemo(() => {
    try {
      return (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      );
    } catch {
      return false;
    }
  }, [file]);

  const share = useCallback(() => {
    navigator
      .share({ files: [file], title: "เพื่อนซี้ของฉัน ♡" })
      .catch(() => undefined);
  }, [file]);

  return (
    <Modal title="รูปคู่เพื่อนซี้" close={close} className="ch-photo-modal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ch-photo-img"
        src={url}
        alt="รูปน้องหมา น้องแมว และน้องกระต่ายบนเกาะ PAWPAL"
      />
      <div className="ch-photo-actions">
        {canShare ? (
          <button type="button" className="primary-button" onClick={share}>
            แชร์ให้เพื่อน
          </button>
        ) : null}
        <a
          className={canShare ? "secondary-button" : "primary-button"}
          download={FILE_NAME}
          href={url}
        >
          บันทึกรูป
        </a>
      </div>
    </Modal>
  );
}
