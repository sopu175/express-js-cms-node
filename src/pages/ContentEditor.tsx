import "react-quill/dist/quill.snow.css";

import { ArrowLeft, Eye, Globe, Save, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "react-query";
import { useNavigate, useParams } from "react-router-dom";

import ReactQuill from "react-quill";
import { api } from "../services/api";
import toast from "react-hot-toast";

export const ContentEditor: React.FC = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const isEditing = !!id;

   const [formData, setFormData] = useState({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      type: "post",
      status: "draft",
      featured_image: "",
      meta_title: "",
      meta_description: "",
      tags: "",
      category: "",
   });

   const [sections, setSections] = useState<Array<any>>([]);

   // Fetch content for editing
   const { data: content, isLoading } = useQuery(
      ["content", id],
      () => api.get(`/content/${id}`).then((res) => res.data),
      { enabled: isEditing }
   );

   // Create mutation
   const createMutation = useMutation((data: any) => api.post("/content", data), {
      onSuccess: () => {
         toast.success("Content created successfully!");
         navigate("/content");
      },
      onError: (error: any) => {
         toast.error(error.response?.data?.error || "Failed to create content");
      },
   });

   // Update mutation
   const updateMutation = useMutation((data: any) => api.put(`/content/${id}`, data), {
      onSuccess: () => {
         toast.success("Content updated successfully!");
         navigate("/content");
      },
      onError: (error: any) => {
         toast.error(error.response?.data?.error || "Failed to update content");
      },
   });

   // Publish mutation
   const publishMutation = useMutation((contentId: string) => api.post(`/content/${contentId}/publish`), {
      onSuccess: () => {
         toast.success("Content published successfully!");
         navigate("/content");
      },
      onError: (error: any) => {
         toast.error(error.response?.data?.error || "Failed to publish content");
      },
   });

   useEffect(() => {
      if (content) {
         setFormData({
            title: content.title || "",
            slug: content.slug || "",
            content: content.content || "",
            excerpt: content.excerpt || "",
            type: content.type || "post",
            status: content.status || "draft",
            featured_image: content.featured_image || "",
            meta_title: content.meta_title || "",
            meta_description: content.meta_description || "",
            tags: content.tags || "",
            category: content.category || "",
         });
         setSections(content.sections || []);
      }
   }, [content]);

   const addSection = () => {
      setSections([
         ...sections,
         {
            name: "",
            slug: "",
            excerpt: "",
            description: "",
            type: "default",
            texts: [""],
            uls: [[""]],
            tables: [[[""]]],
            images: [{ url: "", isThumb: false, isBanner: false }],
            postList: [],
         },
      ]);
   };

   const updateSectionField = (idx: number, field: string, value: any) => {
      setSections(sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
   };

   const addSectionItem = (idx: number, field: string, defaultValue: any) => {
      setSections(sections.map((s, i) => (i === idx ? { ...s, [field]: [...(s[field] || []), defaultValue] } : s)));
   };

   const updateSectionItem = (idx: number, field: string, itemIdx: number, value: any) => {
      setSections(
         sections.map((s, i) =>
            i === idx ? { ...s, [field]: s[field].map((item: any, j: number) => (j === itemIdx ? value : item)) } : s
         )
      );
   };

   const removeSectionItem = (idx: number, field: string, itemIdx: number) => {
      setSections(
         sections.map((s, i) =>
            i === idx ? { ...s, [field]: s[field].filter((_: any, j: number) => j !== itemIdx) } : s
         )
      );
   };

   const removeSection = (idx: number) => {
      setSections(sections.filter((_, i) => i !== idx));
   };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const dataToSend = { ...formData, sections };
      if (isEditing) {
         updateMutation.mutate(dataToSend);
      } else {
         createMutation.mutate(dataToSend);
      }
   };

   const handlePublish = () => {
      if (isEditing) {
         publishMutation.mutate(id);
      } else {
         // Save as published
         createMutation.mutate({ ...formData, status: "published" });
      }
   };

   const generateSlug = () => {
      const slug = formData.title
         .toLowerCase()
         .replace(/[^a-z0-9 -]/g, "")
         .replace(/\s+/g, "-")
         .replace(/-+/g, "-")
         .trim("-");
      setFormData((prev) => ({ ...prev, slug }));
   };

   // Add this helper for slug generation
   const generateSectionSlug = (name: string) =>
      name
         .toLowerCase()
         .replace(/[^a-z0-9 -]/g, "")
         .replace(/\s+/g, "-")
         .replace(/-+/g, "-")
         .trim("-");

   if (isLoading) {
      return (
         <div className="space-y-6">
            <div className="animate-pulse">
               <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
               <div className="space-y-4">
                  <div className="h-10 bg-gray-300 rounded"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                  <div className="h-40 bg-gray-300 rounded"></div>
               </div>
            </div>
         </div>
      );
   }

   const modules = {
      toolbar: [
         [{ header: [1, 2, false] }],
         ["bold", "italic", "underline", "strike", "blockquote"],
         [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
         ["link", "image"],
         ["clean"],
      ],
   };

   const formats = [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "blockquote",
      "list",
      "bullet",
      "indent",
      "link",
      "image",
   ];

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <button
                  onClick={() => navigate("/content")}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
               >
                  <ArrowLeft className="h-5 w-5" />
               </button>
               <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                     {isEditing ? "Edit Content" : "Create New Content"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                     {isEditing ? "Update your existing content" : "Write and publish new content"}
                  </p>
               </div>
            </div>

            <div className="flex items-center space-x-3">
               <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
               >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
               </button>

               <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
               >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
               </button>
            </div>
         </div>

         <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input
                           type="text"
                           required
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.title}
                           onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                           placeholder="Enter content title"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                        <div className="flex">
                           <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              value={formData.slug}
                              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                              placeholder="content-slug"
                           />
                           <button
                              type="button"
                              onClick={generateSlug}
                              className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                           >
                              Generate
                           </button>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Excerpt
                        </label>
                        <textarea
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.excerpt}
                           onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                           placeholder="Brief description of your content"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Content
                        </label>
                        <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                           <ReactQuill
                              theme="snow"
                              modules={modules}
                              formats={formats}
                              value={formData.content}
                              onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                              className="min-h-[300px]"
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Sections Editor */}
               <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sections</h3>
                     <button
                        type="button"
                        onClick={addSection}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                     >
                        + Add Section
                     </button>
                  </div>
                  {sections.map((section, idx) => (
                     <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4"
                     >
                        <div className="flex items-center gap-4">
                           <div className="flex-1 space-y-4">
                              {/* Section Name */}
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Section Name
                                 </label>
                                 <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Section Name"
                                    value={section.name}
                                    onChange={(e) => {
                                       updateSectionField(idx, "name", e.target.value);
                                       updateSectionField(idx, "slug", generateSectionSlug(e.target.value));
                                    }}
                                 />
                              </div>
                              {/* Section Slug */}
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Slug
                                 </label>
                                 <div className="flex">
                                    <input
                                       type="text"
                                       className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                       placeholder="section-slug"
                                       value={section.slug}
                                       onChange={(e) => updateSectionField(idx, "slug", e.target.value)}
                                    />
                                    <button
                                       type="button"
                                       onClick={() =>
                                          updateSectionField(idx, "slug", generateSectionSlug(section.name))
                                       }
                                       className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                    >
                                       Generate
                                    </button>
                                 </div>
                              </div>
                              {/* Section Excerpt */}
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Excerpt
                                 </label>
                                 <textarea
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    value={section.excerpt}
                                    onChange={(e) => updateSectionField(idx, "excerpt", e.target.value)}
                                    placeholder="Brief description of this section"
                                 />
                              </div>
                              {/* Section Description */}
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                 </label>
                                 <textarea
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    value={section.description}
                                    onChange={(e) => updateSectionField(idx, "description", e.target.value)}
                                    placeholder="Detailed description of this section"
                                 />
                              </div>
                              {/* Section Type */}
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Type
                                 </label>
                                 <select
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    value={section.type}
                                    onChange={(e) => updateSectionField(idx, "type", e.target.value)}
                                 >
                                    <option value="default">Default</option>
                                    <option value="feature">Feature</option>
                                 </select>
                              </div>
                           </div>
                           <button
                              type="button"
                              onClick={() => removeSection(idx)}
                              className="ml-4 text-red-600 hover:underline"
                           >
                              Remove
                           </button>
                        </div>

                        {/* Section Feature Image */}
                        <div className="mb-4">
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Feature Image
                           </label>
                           <div className="flex flex-col items-start gap-2">
                              {section.featured_image && (
                                 <img
                                    src={section.featured_image}
                                    alt="preview"
                                    className="h-12 w-12 object-cover rounded"
                                 />
                              )}
                              <input
                                 type="file"
                                 accept="image/*"
                                 id={`section-feature-image-${idx}`}
                                 className="hidden"
                                 onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    // TODO: Replace with your upload logic
                                    const url = URL.createObjectURL(file);
                                    updateSectionField(idx, "featured_image", url);
                                 }}
                              />
                              <label htmlFor={`section-feature-image-${idx}`}>
                                 <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    onClick={(e) => {
                                       e.preventDefault();
                                       document.getElementById(`section-feature-image-${idx}`)?.click();
                                    }}
                                 >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload File
                                 </button>
                              </label>
                              <button
                                 type="button"
                                 className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    section.featured_image_isThumb
                                       ? "bg-blue-600 text-white border-blue-600"
                                       : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                 }`}
                                 onClick={() =>
                                    updateSectionField(idx, "featured_image_isThumb", !section.featured_image_isThumb)
                                 }
                              >
                                 Thumb
                              </button>
                              <button
                                 type="button"
                                 className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    section.featured_image_isBanner
                                       ? "bg-green-600 text-white border-green-600"
                                       : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                 }`}
                                 onClick={() =>
                                    updateSectionField(idx, "featured_image_isBanner", !section.featured_image_isBanner)
                                 }
                              >
                                 Banner
                              </button>
                           </div>
                        </div>

                        {/* Texts */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Texts
                           </label>
                           <div className="space-y-2">
                              {section.texts.map((text: string, tIdx: number) => (
                                 <div key={tIdx} className="flex gap-2">
                                    <textarea
                                       className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                       value={text}
                                       onChange={(e) => updateSectionItem(idx, "texts", tIdx, e.target.value)}
                                       placeholder="Text"
                                    />
                                    <button
                                       type="button"
                                       onClick={() => removeSectionItem(idx, "texts", tIdx)}
                                       className="text-red-500"
                                    >
                                       Remove
                                    </button>
                                 </div>
                              ))}
                              <button
                                 type="button"
                                 onClick={() => addSectionItem(idx, "texts", "")}
                                 className="text-blue-600 hover:underline"
                              >
                                 + Add Text
                              </button>
                           </div>
                        </div>

                        {/* ULs */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              UL Lists
                           </label>
                           <div className="space-y-2">
                              {section.uls.map((ul: string[], ulIdx: number) => (
                                 <div key={ulIdx} className="flex gap-2">
                                    <textarea
                                       className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                       value={ul.join("\n")}
                                       onChange={(e) =>
                                          updateSectionItem(idx, "uls", ulIdx, e.target.value.split("\n"))
                                       }
                                       placeholder="One list item per line"
                                    />
                                    <button
                                       type="button"
                                       onClick={() => removeSectionItem(idx, "uls", ulIdx)}
                                       className="text-red-500"
                                    >
                                       Remove
                                    </button>
                                 </div>
                              ))}
                              <button
                                 type="button"
                                 onClick={() => addSectionItem(idx, "uls", [""])}
                                 className="text-blue-600 hover:underline"
                              >
                                 + Add UL
                              </button>
                           </div>
                        </div>

                        {/* Tables */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Tables
                           </label>
                           <div className="space-y-2">
                              {section.tables.map((table: string[][], tblIdx: number) => (
                                 <div key={tblIdx} className="flex gap-2">
                                    <textarea
                                       className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                       value={table.map((row) => row.join(",")).join("\n")}
                                       onChange={(e) =>
                                          updateSectionItem(
                                             idx,
                                             "tables",
                                             tblIdx,
                                             e.target.value.split("\n").map((line) => line.split(","))
                                          )
                                       }
                                       placeholder="CSV rows, comma separated"
                                    />
                                    <button
                                       type="button"
                                       onClick={() => removeSectionItem(idx, "tables", tblIdx)}
                                       className="text-red-500"
                                    >
                                       Remove
                                    </button>
                                 </div>
                              ))}
                              <button
                                 type="button"
                                 onClick={() => addSectionItem(idx, "tables", [[""]])}
                                 className="text-blue-600 hover:underline"
                              >
                                 + Add Table
                              </button>
                           </div>
                        </div>

                        {/* Images */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Images
                           </label>
                           <div className="space-y-2">
                              {section.images.map((img: any, imgIdx: number) => (
                                 <div key={imgIdx} className="flex flex-col items-start gap-2">
                                    {img.url && (
                                       <img src={img.url} alt="preview" className="h-12 w-12 object-cover rounded" />
                                    )}
                                    {/* Hidden file input */}
                                    <input
                                       type="file"
                                       accept="image/*"
                                       id={`section-image-${idx}-${imgIdx}`}
                                       className="hidden"
                                       onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          // TODO: Replace with your upload logic
                                          const url = URL.createObjectURL(file);
                                          updateSectionItem(idx, "images", imgIdx, { ...img, url });
                                       }}
                                    />
                                    <label htmlFor={`section-image-${idx}-${imgIdx}`}>
                                       <button
                                          type="button"
                                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                          onClick={(e) => {
                                             e.preventDefault();
                                             document.getElementById(`section-image-${idx}-${imgIdx}`)?.click();
                                          }}
                                       >
                                          <Upload className="h-4 w-4 mr-2" />
                                          Upload File
                                       </button>
                                    </label>
                                    {/* Thumb & Banner as pill toggles */}
                                    <button
                                       type="button"
                                       className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                          img.isThumb
                                             ? "bg-blue-600 text-white border-blue-600"
                                             : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                       }`}
                                       onClick={() =>
                                          updateSectionItem(idx, "images", imgIdx, { ...img, isThumb: !img.isThumb })
                                       }
                                    >
                                       Thumb
                                    </button>
                                    <button
                                       type="button"
                                       className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                          img.isBanner
                                             ? "bg-green-600 text-white border-green-600"
                                             : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                       }`}
                                       onClick={() =>
                                          updateSectionItem(idx, "images", imgIdx, { ...img, isBanner: !img.isBanner })
                                       }
                                    >
                                       Banner
                                    </button>
                                    <button
                                       type="button"
                                       onClick={() => removeSectionItem(idx, "images", imgIdx)}
                                       className="text-red-500"
                                    >
                                       Remove
                                    </button>
                                 </div>
                              ))}
                              <button
                                 type="button"
                                 onClick={() =>
                                    addSectionItem(idx, "images", { url: "", isThumb: false, isBanner: false })
                                 }
                                 className="text-blue-600 hover:underline"
                              >
                                 + Add Image
                              </button>
                           </div>
                        </div>

                        {/* Post List */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Post List
                           </label>
                           <div className="space-y-6">
                              {section.postList.map((post, postIdx) => (
                                 <div
                                    key={postIdx}
                                    className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4"
                                 >
                                    {/* Name */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Post Name
                                       </label>
                                       <input
                                          type="text"
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                          placeholder="Post Name"
                                          value={post.name}
                                          onChange={(e) => {
                                             const updated = [...section.postList];
                                             updated[postIdx] = {
                                                ...updated[postIdx],
                                                name: e.target.value,
                                                slug: generateSectionSlug(e.target.value),
                                             };
                                             updateSectionField(idx, "postList", updated);
                                          }}
                                       />
                                    </div>
                                    {/* Slug */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Slug
                                       </label>
                                       <div className="flex">
                                          <input
                                             type="text"
                                             className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg dark:bg-gray-700 dark:text-white"
                                             placeholder="post-slug"
                                             value={post.slug}
                                             onChange={(e) => {
                                                const updated = [...section.postList];
                                                updated[postIdx] = { ...updated[postIdx], slug: e.target.value };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                          />
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const updated = [...section.postList];
                                                updated[postIdx] = {
                                                   ...updated[postIdx],
                                                   slug: generateSectionSlug(post.name),
                                                };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                             className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                          >
                                             Generate
                                          </button>
                                       </div>
                                    </div>
                                    {/* Excerpt */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Excerpt
                                       </label>
                                       <textarea
                                          rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                          value={post.excerpt}
                                          onChange={(e) => {
                                             const updated = [...section.postList];
                                             updated[postIdx] = { ...updated[postIdx], excerpt: e.target.value };
                                             updateSectionField(idx, "postList", updated);
                                          }}
                                          placeholder="Brief description of this post"
                                       />
                                    </div>
                                    {/* Description */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Description
                                       </label>
                                       <textarea
                                          rows={5}
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                          value={post.description}
                                          onChange={(e) => {
                                             const updated = [...section.postList];
                                             updated[postIdx] = { ...updated[postIdx], description: e.target.value };
                                             updateSectionField(idx, "postList", updated);
                                          }}
                                          placeholder="Detailed description of this post"
                                       />
                                    </div>
                                    {/* Type */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Type
                                       </label>
                                       <select
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                          value={post.type || "default"}
                                          onChange={(e) => {
                                             const updated = [...section.postList];
                                             updated[postIdx] = { ...updated[postIdx], type: e.target.value };
                                             updateSectionField(idx, "postList", updated);
                                          }}
                                       >
                                          <option value="default">Default</option>
                                          <option value="feature">Feature</option>
                                       </select>
                                    </div>
                                    {/* Texts */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Texts
                                       </label>
                                       <div className="space-y-2">
                                          {(post.texts || []).map((text: string, tIdx: number) => (
                                             <div key={tIdx} className="flex gap-2">
                                                <textarea
                                                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                   value={text}
                                                   onChange={(e) => {
                                                      const updated = [...section.postList];
                                                      const texts = [...(post.texts || [])];
                                                      texts[tIdx] = e.target.value;
                                                      updated[postIdx] = { ...updated[postIdx], texts };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   placeholder="Text"
                                                />
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const texts = [...(post.texts || [])];
                                                      texts.splice(tIdx, 1);
                                                      updated[postIdx] = { ...updated[postIdx], texts };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   className="text-red-500"
                                                >
                                                   Remove
                                                </button>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const updated = [...section.postList];
                                                const texts = [...(post.texts || []), ""];
                                                updated[postIdx] = { ...updated[postIdx], texts };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                             className="text-blue-600 hover:underline"
                                          >
                                             + Add Text
                                          </button>
                                       </div>
                                    </div>
                                    {/* ULs */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          UL Lists
                                       </label>
                                       <div className="space-y-2">
                                          {(post.uls || []).map((ul: string[], ulIdx: number) => (
                                             <div key={ulIdx} className="flex gap-2">
                                                <textarea
                                                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                   value={ul.join("\n")}
                                                   onChange={(e) => {
                                                      const updated = [...section.postList];
                                                      const uls = [...(post.uls || [])];
                                                      uls[ulIdx] = e.target.value.split("\n");
                                                      updated[postIdx] = { ...updated[postIdx], uls };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   placeholder="One list item per line"
                                                />
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const uls = [...(post.uls || [])];
                                                      uls.splice(ulIdx, 1);
                                                      updated[postIdx] = { ...updated[postIdx], uls };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   className="text-red-500"
                                                >
                                                   Remove
                                                </button>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const updated = [...section.postList];
                                                const uls = [...(post.uls || []), [""]];
                                                updated[postIdx] = { ...updated[postIdx], uls };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                             className="text-blue-600 hover:underline"
                                          >
                                             + Add UL
                                          </button>
                                       </div>
                                    </div>
                                    {/* Tables */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Tables
                                       </label>
                                       <div className="space-y-2">
                                          {(post.tables || []).map((table: string[][], tblIdx: number) => (
                                             <div key={tblIdx} className="flex gap-2">
                                                <textarea
                                                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                   value={table.map((row) => row.join(",")).join("\n")}
                                                   onChange={(e) => {
                                                      const updated = [...section.postList];
                                                      const tables = [...(post.tables || [])];
                                                      tables[tblIdx] = e.target.value
                                                         .split("\n")
                                                         .map((line) => line.split(","));
                                                      updated[postIdx] = { ...updated[postIdx], tables };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   placeholder="CSV rows, comma separated"
                                                />
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const tables = [...(post.tables || [])];
                                                      tables.splice(tblIdx, 1);
                                                      updated[postIdx] = { ...updated[postIdx], tables };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   className="text-red-500"
                                                >
                                                   Remove
                                                </button>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const updated = [...section.postList];
                                                const tables = [...(post.tables || []), [[""]]];
                                                updated[postIdx] = { ...updated[postIdx], tables };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                             className="text-blue-600 hover:underline"
                                          >
                                             + Add Table
                                          </button>
                                       </div>
                                    </div>
                                    {/* Images */}
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Images
                                       </label>
                                       <div className="space-y-2">
                                          {(post.images || []).map((img: any, imgIdx: number) => (
                                             <div
                                                key={imgIdx}
                                                className="flex flex flex-col items-start gap-2 items-left gap-2"
                                             >
                                                {img.url && (
                                                   <img
                                                      src={img.url}
                                                      alt="preview"
                                                      className="h-12 w-12 object-cover rounded"
                                                   />
                                                )}
                                                {/* Hidden file input */}
                                                <input
                                                   type="file"
                                                   accept="image/*"
                                                   id={`post-image-${idx}-${postIdx}-${imgIdx}`}
                                                   className="hidden"
                                                   onChange={async (e) => {
                                                      const file = e.target.files?.[0];
                                                      if (!file) return;
                                                      // TODO: Replace with your upload logic
                                                      const url = URL.createObjectURL(file);
                                                      const updated = [...section.postList];
                                                      const images = [...(post.images || [])];
                                                      images[imgIdx] = { ...img, url };
                                                      updated[postIdx] = { ...updated[postIdx], images };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                />
                                                <label htmlFor={`post-image-${idx}-${postIdx}-${imgIdx}`}>
                                                   <button
                                                      type="button"
                                                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                      onClick={(e) => {
                                                         e.preventDefault();
                                                         document
                                                            .getElementById(`post-image-${idx}-${postIdx}-${imgIdx}`)
                                                            ?.click();
                                                      }}
                                                   >
                                                      <Upload className="h-4 w-4 mr-2" />
                                                      Upload File
                                                   </button>
                                                </label>
                                                <button
                                                   type="button"
                                                   className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                      img.isThumb
                                                         ? "bg-blue-600 text-white border-blue-600"
                                                         : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                                   }`}
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const images = [...(post.images || [])];
                                                      images[imgIdx] = { ...img, isThumb: !img.isThumb };
                                                      updated[postIdx] = { ...updated[postIdx], images };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                >
                                                   Thumb
                                                </button>
                                                <button
                                                   type="button"
                                                   className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                      img.isBanner
                                                         ? "bg-green-600 text-white border-green-600"
                                                         : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                                                   }`}
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const images = [...(post.images || [])];
                                                      images[imgIdx] = { ...img, isBanner: !img.isBanner };
                                                      updated[postIdx] = { ...updated[postIdx], images };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                >
                                                   Banner
                                                </button>
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      const updated = [...section.postList];
                                                      const images = [...(post.images || [])];
                                                      images.splice(imgIdx, 1);
                                                      updated[postIdx] = { ...updated[postIdx], images };
                                                      updateSectionField(idx, "postList", updated);
                                                   }}
                                                   className="text-red-500"
                                                >
                                                   Remove
                                                </button>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const updated = [...section.postList];
                                                const images = [
                                                   ...(post.images || []),
                                                   { url: "", isThumb: false, isBanner: false },
                                                ];
                                                updated[postIdx] = { ...updated[postIdx], images };
                                                updateSectionField(idx, "postList", updated);
                                             }}
                                             className="text-blue-600 hover:underline"
                                          >
                                             + Add Image
                                          </button>
                                       </div>
                                    </div>

                                    {/* Nested Post List (optional, recursive) */}
                                    {/* You can add a recursive call here if you want nested post lists */}
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const updated = section.postList.filter((_: any, i: number) => i !== postIdx);
                                          updateSectionField(idx, "postList", updated);
                                       }}
                                       className="text-red-500 ml-auto"
                                    >
                                       Remove Post
                                    </button>
                                 </div>
                              ))}
                              <button
                                 type="button"
                                 onClick={() =>
                                    updateSectionField(idx, "postList", [
                                       ...section.postList,
                                       {
                                          name: "",
                                          slug: "",
                                          excerpt: "",
                                          description: "",
                                          type: "default",
                                          texts: [""],
                                          uls: [[""]],
                                          tables: [[[""]]],
                                          images: [{ url: "", isThumb: false, isBanner: false }],
                                          postList: [],
                                       },
                                    ])
                                 }
                                 className="text-blue-600 hover:underline"
                              >
                                 + Add Post
                              </button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
               {/* Publish Settings */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Publish Settings</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Status
                        </label>
                        <select
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.status}
                           onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                        >
                           <option value="draft">Draft</option>
                           <option value="published">Published</option>
                           <option value="archived">Archived</option>
                        </select>
                     </div>

                     <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                        <select
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.type}
                           onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                        >
                           <option value="post">Post</option>
                           <option value="page">Page</option>
                           <option value="article">Article</option>
                        </select>
                     </div>
                  </div>

                  {/* Feature Image for Content */}
                  <div className="mt-4">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Feature Image
                     </label>
                     <div className="flex items-left gap-2 flex-col">
                        {formData.featured_image && (
                           <img
                              src={formData.featured_image}
                              alt="preview"
                              className="h-12 w-12 object-cover rounded"
                           />
                        )}
                        <input
                           type="file"
                           accept="image/*"
                           id="content-feature-image"
                           className="hidden"
                           onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              // TODO: Replace with your upload logic
                              const url = URL.createObjectURL(file);
                              setFormData((prev) => ({ ...prev, featured_image: url }));
                           }}
                        />
                        <label htmlFor="content-feature-image">
                           <button
                              type="button"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              onClick={(e) => {
                                 e.preventDefault();
                                 document.getElementById("content-feature-image")?.click();
                              }}
                           >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload File
                           </button>
                        </label>
                        {/* Banner/Thumb toggles for content */}
                        <button
                           type="button"
                           className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              formData.featured_image_isThumb
                                 ? "bg-blue-600 text-white border-blue-600"
                                 : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                           }`}
                           onClick={() =>
                              setFormData((prev) => ({ ...prev, featured_image_isThumb: !prev.featured_image_isThumb }))
                           }
                        >
                           Thumb
                        </button>
                        <button
                           type="button"
                           className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              formData.featured_image_isBanner
                                 ? "bg-green-600 text-white border-green-600"
                                 : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                           }`}
                           onClick={() =>
                              setFormData((prev) => ({
                                 ...prev,
                                 featured_image_isBanner: !prev.featured_image_isBanner,
                              }))
                           }
                        >
                           Banner
                        </button>
                     </div>
                  </div>
               </div>

               {/* Categories & Tags */}
               <div className="bg-white mb-4 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Organization</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Category
                        </label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.category}
                           onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                           placeholder="e.g., Technology, Health"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.tags}
                           onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                           placeholder="react, javascript, tutorial"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate tags with commas</p>
                     </div>
                  </div>
               </div>

               {/* SEO */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">SEO Settings</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Meta Title
                        </label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.meta_title}
                           onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                           placeholder="SEO title"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Meta Description
                        </label>
                        <textarea
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                           value={formData.meta_description}
                           onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                           placeholder="SEO description"
                        />
                     </div>
                  </div>
               </div>
            </div>
         </form>
      </div>
   );
};
