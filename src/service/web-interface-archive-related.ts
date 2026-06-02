import { apiRequest } from "./request";

export interface WebInterfaceArchiveRelatedRequestParams {
  aid?: number | string;
  bvid?: string;
}

export interface RelatedArchiveItem {
  aid: number;
  bvid: string;
  title: string;
  pic: string;
  owner?: {
    mid?: number;
    name?: string;
  };
  stat?: {
    view?: number;
  };
  duration?: number;
}

export interface WebInterfaceArchiveRelatedResponse {
  code: number;
  message: string;
  ttl: number;
  data?: RelatedArchiveItem[];
}

export const getWebInterfaceArchiveRelated = (params: WebInterfaceArchiveRelatedRequestParams) => {
  return apiRequest.get<WebInterfaceArchiveRelatedResponse>("/x/web-interface/archive/related", { params });
};
