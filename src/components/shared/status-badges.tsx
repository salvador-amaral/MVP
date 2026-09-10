import { Badge } from "@/components/ui/badge";
import {
  REQUEST_ITEM_STATUS_BADGE_STYLES,
  REQUEST_ITEM_STATUS_LABELS,
  REQUEST_STATUS_BADGE_STYLES,
  REQUEST_STATUS_LABELS,
} from "@/lib/constants";
import type {
  RequestItemStatus,
  RequestStatus,
} from "@/types/database";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant={REQUEST_STATUS_BADGE_STYLES[status]}>
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RequestItemStatusBadge({
  status,
}: {
  status: RequestItemStatus;
}) {
  return (
    <Badge variant={REQUEST_ITEM_STATUS_BADGE_STYLES[status]}>
      {REQUEST_ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}
