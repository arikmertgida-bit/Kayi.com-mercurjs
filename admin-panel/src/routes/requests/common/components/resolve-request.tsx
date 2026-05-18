
import { useState } from "react";
import { Button, Prompt, Textarea, toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { useReviewRequest, useDeleteRequest } from "@hooks/api/requests";

type Props = {
  close: () => void;
  onSuccess?: () => void;
  open: boolean;
  id: string;
  accept: boolean;
};

export function ResolveRequestPrompt({
  open,
  id,
  accept,
  close,
  onSuccess,
}: Props) {
  const { mutateAsync: reviewRequest } = useReviewRequest({});
  const { mutateAsync: deleteRequest } = useDeleteRequest();
  const { t } = useTranslation();
  const [note, setNote] = useState("");

  const handleReview = async () => {
    try {
      const status = accept ? "accepted" : "rejected";
      await reviewRequest({ id, payload: { status, reviewer_note: note } });
      await deleteRequest({ id });
      toast.success(
        accept
          ? t("requests.reviewRemove.toastAccepted")
          : t("requests.reviewRemove.toastRejected")
      );
      onSuccess?.();
    } catch (e: unknown) {
      toast.error(t("requests.reviewRemove.toastError", { message: (e as Error).message }));
    } finally {
      setNote("");
      close();
    }
  };

  const handleClose = () => {
    setNote("");
    close();
  };

  return (
    <Prompt open={open}>
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>
            {accept
              ? t("requests.reviewRemove.acceptTitle")
              : t("requests.reviewRemove.rejectTitle")}
          </Prompt.Title>
          <Prompt.Description>
            {t("requests.reviewRemove.noteDescription")}
          </Prompt.Description>
        </Prompt.Header>
        <div className="px-6 pb-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("requests.reviewRemove.notePlaceholder")}
            rows={3}
          />
        </div>
        <Prompt.Footer>
          <Button variant="secondary" onClick={handleClose}>
            {t("requests.reviewRemove.cancel")}
          </Button>
          <Button onClick={handleReview}>{t("requests.reviewRemove.submit")}</Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
}
