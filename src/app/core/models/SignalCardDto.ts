import { FiveLevelInterpretation } from "./GetAnalyticalLayerResultDto";
export interface SignalCardDto {
  layerID: number;
  layerCode: string;
  layerName: string;
  description: string;
  code: string;
  name: string;
  value: number;
  condition: string;
  narrative: string;
  descriptor: string;
  interpretationID: number;
  isAlert: boolean;
  isAccessible: boolean;
  displayOrder?: number | null;
  interpretations: FiveLevelInterpretation[];
  climateProgramID: number;
}

export interface NarrativeDto {
  headline: string;
  detail: string;
}
