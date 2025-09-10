import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Plus, XCircle } from "lucide-react";
import { config } from "@/utils/config";

interface QuestionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  addAnswer: () => void;
  updateAnswer: (index: number, field: string, value: any) => void;
  removeAnswer: (index: number) => void;
  formValidationError: string | null;
  tempMedia: { image: File | null; audio: File | null; video: File | null };
  mediaProgress: { image: number; audio: number; video: number };
  mediaUploading: boolean;
  mediaError: string | null;
  onSelectMedia: (type: "image" | "audio" | "video", file: File | null) => void;
  isEditing?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  addAnswer,
  updateAnswer,
  removeAnswer,
  formValidationError,
  tempMedia,
  mediaProgress,
  mediaUploading,
  mediaError,
  onSelectMedia,
  isEditing = false,
}) => {
  // Raw keyword input buffer so users can type freely including trailing commas/spaces.
  const [keywordInput, setKeywordInput] = useState<string>(
    formData.keywords?.length ? formData.keywords.join(", ") : ""
  );

  // Sync buffer when external formData.keywords change (e.g., editing existing question)
  useEffect(() => {
    setKeywordInput(
      formData.keywords?.length ? formData.keywords.join(", ") : ""
    );
  }, [formData.keywords]);

  const [objectUrls, setObjectUrls] = useState<{
    image?: string;
    audio?: string;
    video?: string;
  }>({});

  useEffect(() => {
    const next: any = {};
    const prev = objectUrls;
    if (tempMedia.image) {
      const key = `${tempMedia.image.name}-${tempMedia.image.lastModified}`;
      if (!prev.image || !prev.image.includes(key)) {
        if (prev.image) URL.revokeObjectURL(prev.image.split("|__key__")[0]);
        next.image = `${URL.createObjectURL(tempMedia.image)}|__key__${key}`;
      } else next.image = prev.image;
    } else if (prev.image) {
      URL.revokeObjectURL(prev.image.split("|__key__")[0]);
    }
    if (tempMedia.audio) {
      const key = `${tempMedia.audio.name}-${tempMedia.audio.lastModified}`;
      if (!prev.audio || !prev.audio.includes(key)) {
        if (prev.audio) URL.revokeObjectURL(prev.audio.split("|__key__")[0]);
        next.audio = `${URL.createObjectURL(tempMedia.audio)}|__key__${key}`;
      } else next.audio = prev.audio;
    } else if (prev.audio) {
      URL.revokeObjectURL(prev.audio.split("|__key__")[0]);
    }
    if (tempMedia.video) {
      const key = `${tempMedia.video.name}-${tempMedia.video.lastModified}`;
      if (!prev.video || !prev.video.includes(key)) {
        if (prev.video) URL.revokeObjectURL(prev.video.split("|__key__")[0]);
        next.video = `${URL.createObjectURL(tempMedia.video)}|__key__${key}`;
      } else next.video = prev.video;
    } else if (prev.video) {
      URL.revokeObjectURL(prev.video.split("|__key__")[0]);
    }
    setObjectUrls(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempMedia.image, tempMedia.audio, tempMedia.video]);

  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((v) => {
        if (v) URL.revokeObjectURL(v.split("|__key__")[0]);
      });
    };
  }, [objectUrls]);

  const handleSubmit = () => {
    onSubmit();
  };

  const handleRemoveExistingMedia = (type: "image" | "audio" | "video") => {
    const pathField = `${type}Path`;
    setFormData({ ...formData, [pathField]: "" });
  };

  const normalizeUrl = (raw?: string) => {
    if (!raw) return "";
    if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${config.apiUrl.replace(/\/$/, "")}${
      raw.startsWith("/") ? "" : "/"
    }${raw}`;
  };

  return (
    <div className="space-y-8 p-2">
      <div>
        <Label htmlFor="question-text" className="text-base font-medium">
          Question Text *
        </Label>
        <div className="mt-2">
          <RichTextEditor
            value={formData.text}
            onChange={(value) => setFormData({ ...formData, text: value })}
            placeholder="Enter your question here. You can include mathematical equations using the math button in the toolbar."
            height="120px"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="question-explanation" className="text-base font-medium">
          Explanation (Optional)
        </Label>
        <div className="mt-2">
          <RichTextEditor
            value={formData.explanation || ""}
            onChange={(value) =>
              setFormData({ ...formData, explanation: value })
            }
            placeholder="Provide an explanation or additional context for this question. You can include mathematical equations and formatting."
            height="100px"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formData.explanation
            ? formData.explanation.replace(/<[^>]*>/g, "").length
            : 0}
          /1000 characters
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="question-type" className="text-base font-medium">
            Question Type
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: "multiple_choice" | "true_false") =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True or False</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty" className="text-base font-medium">
            Difficulty
          </Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: "easy" | "medium" | "hard") =>
              setFormData({ ...formData, difficulty: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="points">Points *</Label>
          <Input
            id="points"
            type="number"
            min="1"
            max="100"
            value={formData.points}
            onChange={(e) =>
              setFormData({
                ...formData,
                points: parseInt(e.target.value) || 1,
              })
            }
            placeholder="1"
            required
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onBlur={() => {
              const parsed = keywordInput
                .split(",")
                .map((k) => k.trim())
                .filter((k) => k.length > 0);
              setFormData({ ...formData, keywords: parsed });
              // Normalize buffer formatting after parse
              setKeywordInput(parsed.join(", "));
            }}
            placeholder="math, algebra, equations"
            className="mt-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Type keywords separated by commas. They are saved when the field
            loses focus.
          </p>
        </div>
      </div>

      
      {/* Media Upload Section */}
      <div className="space-y-6">
        <Label className="text-base font-medium">Media (Optional)</Label>

        {/* Existing Media Display (for editing) */}
        {isEditing && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Existing Media</Label>
            {formData.imagePath && (
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="w-24 h-24 rounded overflow-hidden bg-white border flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={normalizeUrl(formData.imagePath)}
                    alt="Existing image"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = "1";
                        // Retry once with normalized path if original was relative
                        target.src = normalizeUrl(formData.imagePath);
                      } else {
                        // Final fallback: clear image and show placeholder text
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (
                          parent &&
                          !parent.querySelector(".img-fallback-msg")
                        ) {
                          const p = document.createElement("p");
                          p.className =
                            "img-fallback-msg text-[10px] text-gray-500 px-1 text-center break-all";
                          p.textContent = "Image not accessible";
                          parent.appendChild(p);
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex-1 text-xs break-all">
                  <p className="font-medium">Existing Image</p>
                  <p className="text-[10px] text-gray-500 mt-1 break-all">
                    {normalizeUrl(formData.imagePath)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveExistingMedia("image")}
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
            )}
            {formData.audioPath && (
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1 text-xs">
                  <p className="font-medium">Existing Audio</p>
                  <audio
                    controls
                    className="mt-2 w-full"
                    src={formData.audioPath}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveExistingMedia("audio")}
                  >
                    Remove Audio
                  </Button>
                </div>
              </div>
            )}
            {formData.videoPath && (
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="w-40 aspect-video rounded overflow-hidden bg-black/10 border">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    src={formData.videoPath}
                  />
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-medium">Existing Video</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveExistingMedia("video")}
                  >
                    Remove Video
                  </Button>
                </div>
              </div>
            )}
            {!formData.imagePath &&
              !formData.audioPath &&
              !formData.videoPath && (
                <p className="text-xs text-gray-500">No existing media.</p>
              )}
          </div>
        )}

        <div>
          <Label htmlFor="media-upload" className="text-sm font-medium">
            {isEditing
              ? "Replace Media File (deferred upload)"
              : "Select Media File (deferred upload)"}
          </Label>
          <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <Input
              id="media-upload"
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  onSelectMedia("image", null);
                  onSelectMedia("audio", null);
                  onSelectMedia("video", null);
                  return;
                }
                const major = file.type.split("/")[0];
                if (
                  major === "image" ||
                  major === "audio" ||
                  major === "video"
                ) {
                  onSelectMedia(major, file);
                }
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported: Images (JPG, PNG, GIF), Audio (MP3, WAV), Video (MP4,
              AVI). Upload happens on Save.
            </p>
            {mediaError && (
              <p className="text-xs text-red-600 mt-2">{mediaError}</p>
            )}
            <div className="mt-4 space-y-4">
              {tempMedia.image && (
                <div className="flex items-start gap-3">
                  <div className="w-24 h-24 rounded overflow-hidden bg-white border">
                    {objectUrls.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={objectUrls.image.split("|__key__")[0]}
                        alt="Selected image preview"
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-medium break-all">
                      {tempMedia.image.name} (
                      {Math.round(tempMedia.image.size / 1024)} KB)
                    </p>
                    {mediaProgress.image > 0 && (
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${mediaProgress.image}%` }}
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onSelectMedia("image", null)}
                      disabled={mediaUploading}
                    >
                      Remove Image
                    </Button>
                  </div>
                </div>
              )}
              {tempMedia.audio && (
                <div className="flex items-start gap-3">
                  <div className="flex-1 text-xs">
                    <p className="font-medium break-all">
                      {tempMedia.audio.name} (
                      {Math.round(tempMedia.audio.size / 1024)} KB)
                    </p>
                    {objectUrls.audio && (
                      <audio
                        controls
                        className="mt-2 w-full"
                        src={objectUrls.audio.split("|__key__")[0]}
                      />
                    )}
                    {mediaProgress.audio > 0 && (
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${mediaProgress.audio}%` }}
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onSelectMedia("audio", null)}
                      disabled={mediaUploading}
                    >
                      Remove Audio
                    </Button>
                  </div>
                </div>
              )}
              {tempMedia.video && (
                <div className="flex items-start gap-3">
                  <div className="w-40 aspect-video rounded overflow-hidden bg-black/10 border">
                    {objectUrls.video && (
                      <video
                        controls
                        className="w-full h-full object-cover"
                        src={objectUrls.video.split("|__key__")[0]}
                      />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-medium break-all">
                      {tempMedia.video.name} (
                      {Math.round(tempMedia.video.size / 1024)} KB)
                    </p>
                    {mediaProgress.video > 0 && (
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${mediaProgress.video}%` }}
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onSelectMedia("video", null)}
                      disabled={mediaUploading}
                    >
                      Remove Video
                    </Button>
                  </div>
                </div>
              )}
              {!tempMedia.image && !tempMedia.audio && !tempMedia.video && (
                <p className="text-xs text-gray-500">No new media selected.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Answers</Label>
        {formValidationError && (
          <div className="mt-2 text-sm text-red-600 font-medium">
            {formValidationError}
          </div>
        )}
        <div className="space-y-3 mt-4">
          {formData.answers.map((answer: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <Checkbox
                checked={answer.isCorrect}
                onCheckedChange={(checked) =>
                  updateAnswer(index, "isCorrect", checked)
                }
              />
              <div className="flex-1">
                <RichTextEditor
                  value={answer.text}
                  onChange={(value) => updateAnswer(index, "text", value)}
                  placeholder={`Enter answer ${
                    index + 1
                  }. You can include mathematical equations.`}
                  height="80px"
                />
              </div>
              {formData.answers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeAnswer(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAnswer}
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Answer
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={mediaUploading}>
          {mediaUploading ? "Uploading Media..." : "Save Question"}
        </Button>
      </div>
    </div>
  );
};

export default QuestionForm;
