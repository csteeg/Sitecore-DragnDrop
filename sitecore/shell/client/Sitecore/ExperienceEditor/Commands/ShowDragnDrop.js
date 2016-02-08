// require.config({
//   paths: {
//     jqueryui: '/sitecore/shell/Controls/Lib/jQuery/jQueryUI/1.10.3/jquery-ui-1.10.3.min'
//    }   
// // ,shim: {
// //       'jquery': { exports: 'jQuery' },
// //       'jqueryui': { deps: ['jquery'] },
// //   }
// });

define(["sitecore"], function (Sitecore) {
  Sitecore.Commands.ShowDragNDrop =
  {
    _renderingCache: null,
    _fieldDataSourceTemplate: '{1A7C85E5-DC0B-490D-9187-BB1DBCB4C72F}',
    _fieldShowProperties: '{94069F66-609C-48B0-8281-521C30FB269D}',
    _scWebApiUrl: '/-/item/v1/sitecore/shell',
    _pathLoadingImage: "/sitecore/shell/client/Speak/Assets/img/Speak/ProgressIndicator/sc-spinner32.gif",
    _idLoadingElement: "dvLoadingElement",

    commandContext: null,
    _$toolbox: null,
    isEnabled: false,
    
    experienceEditor: function(attrib,args){
        if (typeof (Sitecore.ExperienceEditor[attrib]) != 'undefined'){
            return args ? Sitecore.ExperienceEditor[attrib].apply(Sitecore.ExperienceEditor, args) : Sitecore.ExperienceEditor[attrib]; 
        }
        var xp = require("/-/speak/v1/ExperienceEditor/ExperienceEditor.js"); //Sitecore 8.1 needs the require variant
        if (args)
            return xp[attrib].apply(xp, args);
        return xp[attrib];   
    },
    reEvaluate: function () {
      this.canExecute(this.commandContext);
      if (this.commandContext) {
        this.commandContext.button.set("isEnabled", this.isEnabled);
      }
    },
    canExecute: function (context) {
      if (!this.experienceEditor("isInMode", ["edit"])
        || !context
        || !context.button) {
        return false;
      }

      var isAllowed = (Sitecore.Commands.EnableEditing && Sitecore.Commands.EnableEditing.isEnabled) || (Sitecore.Commands.EnableDesigning && Sitecore.Commands.EnableDesigning.isEnabled);
      this._init(context.button.get("isChecked") == "1");
      if (!this.commandContext) {
        this.commandContext = (this.experienceEditor("instance") || this.experienceEditor("getContext", []).instance).clone(context);//getcontext for 8.1
      }

      this.isEnabled = isAllowed;
      return this.isEnabled;
    },
    
    execute: function (context) {
      var self = this;
      this.experienceEditor("PipelinesUtil").generateRequestProcessor("ExperienceEditor.ToggleRegistryKey.Toggle", function (response) {
        response.context.button.set("isChecked", response.responseValue.value ? "1" : "0");
        self._init(response.context.button.get("isChecked") == "1");
      }, { value: context.button.get("registryKey") }).execute(context);
    },
    
    showLoader: function ($sc) {
      $sc(top.document.body).append("\
        <div id='" + this._idLoadingElement + "'>\
          <div style='background-color: #000000;opacity: 0.6;width: 100%;height: 100%;position: fixed;top: 0px;left: 0px;' ></div>\
          <div style='display:inline-table;padding: 30px;background-color: #FFFFFF;width: 32px;height: 32px;position: absolute;top: 50%;left: 50%;border-radius: 7px;'>\
            <img src='" + this._pathLoadingImage + "' style='height: 32px;width: 32px;'>\
          </div>\
        </div>");
    },

    hideLoader: function ($sc) {
      var dvLoadingElem = $sc(parent.document.body).find("#" + this._idLoadingElement);
      if (typeof dvLoadingElem != 'undefined') {
        $sc(dvLoadingElem).remove();
      }
    },
    
    _init: function(enabled){
        if (!enabled){
            if (this._$toolbox){
                this._$toolbox.hide();
            }
            return;
        }
        if (!this._renderingCache){
            this._renderingCache = new top.Sitecore.PageModes.Cache();
        }
        if (!window.top.$sc){
          console.log("Cannot find $sc variable");
          return;
        }
        var $sc = window.top.$sc;
        if (!$sc.ui){
          var oldJquery = window.top.jQuery;
          window.top.jQuery = $sc;
          window.top.Sitecore.PageModes.Utility.tryAddScripts(['/sitecore/shell/Controls/Lib/jQuery/jQueryUI/1.10.3/jquery-ui-1.10.3.min.js']);
          window.top.jQuery = oldJquery;
        }

        this._ensureToolbox(window.top.Sitecore, $sc);
        this._applyOverrides(window.top.Sitecore, $sc);
        this._addAllRenderings(window.top.Sitecore, $sc);
    },
    
    _ensureToolbox: function(topSitecore, $sc){  
        
        if (!this._$toolbox){
            $sc('body').append('<div id="_boc_toolbox" style="position: fixed"><div id="_boc_toolbox_header">Components</div><div id="_boc_toolbox_groups"></div></div>');
            this._$toolbox = $sc('body').find('#_boc_toolbox');
            this._$toolbox.draggable({handle: '#_boc_toolbox_header'});
            topSitecore.PageModes.Utility.addStyleSheet(
                //is scInsertionHandleCenter a css bug? Or intended to have a transparent block inside
                ".scInsertionHandleCenter { height: 23px !important;} "+
                "#_boc_toolbox {z-index: 9093; position: fixed; top: 235px; left: 40px; color: color: #131313; background-color: #f0f0f0; border: 1px solid black;  font-family: Arial, sans-serif;} "+
                "#_boc_toolbox_header { background-color: #2b2b2b; color: #fff; padding: 12px; cursor: move; } " +
                "#_boc_toolbox ul {padding: 0; margin: 0;  list-style-type:none; max-height: 250px; overflow-y: scroll; overflow-x: hidden; } " +
                "#_boc_toolbox ul._boc_group_closed {overflow-y: hidden; overflow-x: hidden; height: 0px; padding-right: 17px;} " +
                "._boc_renderingItem {background-color:#f0f0f0; z-index: 9095; padding: 12px; cursor: move; cursor: -webkit-grab; } " +
                "._boc_renderingItem img {margin-right: 4px; vertical-align: middle; } " +
                "._boc_renderingItem span { vertical-align: middle; } " +
                "._boc_renderingItem:hover {background-color: #E3E3E3;} " +
                "._boc_renderingItem.ui-draggable-dragging {cursor: -webkit-grabbing; padding: 6px; } " +
                "._boc_catheader {background-color: #474747; color: #000;  padding: 12px; color: #fff; border-bottom: 1px solid #2b2b2b;border-top: 1px solid #2b2b2b; cursor: pointer;} " +
                "._boc_catheader a {float: right; padding-left: 3px;padding-right: 3px; margin-top: -4px;} " +
                "._boc_catheader a:hover {background-color: rgb(227, 227, 227);} "            
            )
        }
    },
    
    _addAllRenderings: function(topSitecore, $sc){
        var allrenderingIds = [],
            self = this;
        
        $sc.each(topSitecore.PageModes.DesignManager.placeholders(), function(index, placeholder) {
            allrenderingIds = $sc.merge(allrenderingIds, placeholder.data.custom.allowedRenderings);
        });
        allrenderingIds = $sc.unique(allrenderingIds);
        if (allrenderingIds.length > 0){
            //go 1 by 1 to prevent duplicate categories due to multiple threads
            var processNext = function(index){
                self._getRendering($sc, allrenderingIds[index], function(renderingItem){
                    if (!renderingItem && console && console.warn) {
                        console.warn("Rendering item not loaded!");
                    }      
                    self._addToToolbox(topSitecore, $sc, renderingItem);
                    if (index < allrenderingIds.length-1){
                        processNext(index+1);
                    }
                });
            }
            processNext(0);
        }
        
    },
    
    _getRendering: function($sc, id, next){
        var cached = this._renderingCache.getValue(id);
        if (cached) {
            next(cached);
            return;
        }
        var self = this;
        $sc.getJSON(this._scWebApiUrl, { sc_database: 'master', scope: 's', fields: this._fieldDataSourceTemplate + '|' + this._fieldShowProperties,  sc_itemid: $sc.toId(id)}, 
            function(data){
                var result;
                if (data && data.result && data.result.items && data.result.items.length == 1){
                    result = data.result.items[0];
                    self._renderingCache.setValue(id, result);
                }
                next(result);
            }).error(next);
    },
    
    _applyOverrides: function(topSitecore, $sc){
        var dragndrop = this;
        //extend sitecore classes:
        topSitecore.PageModes.ChromeTypes.PlaceholderInsertion.prototype.extend({
            addTarget: function (where, chrome, insertPosition) {
                if (this.placeholder.data.custom.allowedRenderings.length == 1){
                var self = this,
                    base = self.base,
                    renderingId = this.placeholder.data.custom.allowedRenderings[0]
                dragndrop._getRendering($sc, renderingId, function(renderingItem){
                    var oldHeader = self.command.header;
                    if (renderingItem)
                        self.command.header = "Add '" + renderingItem.DisplayName + "' component"; //TODO: translateable?
                    base.apply(self, [where,chrome,insertPosition]);
                    //possible threading conflict, no other way for now
                    dragndrop._extendHandle(topSitecore, $sc, self.handles[self.handles.length-1], self, renderingItem, insertPosition, false, dragndrop);
                    self.command.header = oldHeader;
                });
                } else {
                    this.base(where, chrome, insertPosition);
                    //possible threading conflict, no other way for now
                    dragndrop._extendHandle(topSitecore, $sc, this.handles[this.handles.length-1], this, null, insertPosition, true, dragndrop);
                }
            }
        });
        topSitecore.PageModes.ChromeTypes.Placeholder.prototype.extend({
            insertRendering: function(data, openProperties){ 
                //Sitecore.PageModes.PageEditor.postRequest('webedit:setdatasource(referenceId=@RenderingContext.Current.Rendering.UniqueId.ToString("B").ToUpper(),renderingId=@RenderingContext.Current.Rendering.RenderingItem.ID,id=@RenderingContext.Current.Rendering.Item.ID)', null, false)
                var openDataSource = false;
                if ((openProperties + '').indexOf('|') > 0){
                    var bools = openProperties.split('|');
                    openProperties = bools[0];
                    openDataSource = bools[1];
                }
                if (openProperties == "0")
                    openProperties = false;
                if (openDataSource == "0")
                    openDataSource = false;
                
                this.base(data,openProperties);
                
                if (openDataSource) {
                    var $element = $sc(data.html);
                    var $code = $element.first('code');
                    var newRenderingUniqueId = $element.attr("id").substring(2);
                    var newRenderingChrome = this._getChildRenderingByUid(newRenderingUniqueId);
                    if (!newRenderingChrome) {
                        console.error("Cannot find rendering chrome with unique id: " + newRenderingUniqueId);
                        topSitecore.PageModes.ChromeHighlightManager.resume();
                        return;
                    }
                    
                    if ($code.length && newRenderingChrome.isEnabled()){
                        var obj = $sc.parseJSON($code.text());
                        if (obj && obj.commands) {
                            var command = $sc.first(obj.commands, function() { return this.click.indexOf("webedit:setdatasource") > -1; });
                            if (command){
                                topSitecore.PageModes.ChromeManager.setCommandSender(newRenderingChrome);                        
                                window.top.eval(command.click);
                            }
                        }
                    }
                }
                
                dragndrop.hideLoader($sc);
            }
        });

    },
    
    _extendHandle: function (topSitecore, $sc, handle, self, renderingItem, insertPosition, droppableOnly, dragndrop){
        if (handle){
            var addIt = function(e, ui) {
                dragndrop.showLoader($sc);
                try{
                    e.stop();
                    if (!renderingItem && ui){
                        renderingItem = $sc(ui.draggable).data('renderingItem');
                    }
                    topSitecore.PageModes.ChromeManager.setCommandSender(self.placeholder);
                    //Sitecore.PageModes.PageEditor.layoutDefinitionControl().value = Sitecore.PageModes.PageEditor.layout().val();
                    self.placeholder.type._insertPosition = insertPosition;
                    var openProperties = renderingItem.Fields && renderingItem.Fields[self._fieldShowProperties] && renderingItem.Fields[self._fieldShowProperties].Value == "1" ? "1" : "0";
                    if (renderingItem.Fields && renderingItem.Fields[Sitecore.Commands.ShowDragNDrop._fieldDataSourceTemplate] && renderingItem.Fields[Sitecore.Commands.ShowDragNDrop._fieldDataSourceTemplate].Value)
                        openProperties += "|1";
                    self.placeholder.type.addControlResponse($sc.toShortId(renderingItem.ID), openProperties);
                }
                catch (e){
                    dragndrop.hideLoader($sc);
                }
            };
            if (!droppableOnly){
                handle.unbind('click');
                handle.click(addIt);
            }
            if (handle.data('uiDroppable')){
                console.log("remove existing droppable");
                handle.droppable('destroy');
            }
            handle.droppable({ drop: addIt, tolerance: 'pointer', accept: '._boc_renderingItem' });
        }
    },
    
    _hasGroups: false,
    _addToToolbox: function(topSitecore, $sc, renderingItem) {
        if (!renderingItem){
            return;
        }
        var renderingShortId = $sc.toShortId(renderingItem.ID);
        if ($sc('#' + renderingShortId).length > 0)
            return;
        var ids = renderingItem.LongID.split('/'),
            parentId = $sc.toShortId(ids[ids.length -2]),
            groupid = '_boc_toolbox_group_' + parentId,
            $group = $sc('#' + groupid);      
        
        if ($group.length == 0){
            $sc('#_boc_toolbox_groups').append('<div id="' + groupid + '"><div id="' + groupid + '_boc_catheader" class="_boc_catheader">' + renderingItem.Category + '<a href="javascript://" id="'+groupid+'_toggle"><img src="/sitecore/shell/client/Speak/Assets/img/Speak/Common/16x16/dark_gray/navigate_down.png" alt="toggle component group" /></a></div><ul class="' + (this._hasGroups ? '_boc_group_closed' : '') + '"></ul></div>');
            this._hasGroups = true;
            $sc('#'+groupid+'_boc_catheader').click(function() {
                var $img = $sc('#' + groupid + '_boc_catheader img'),
                    $ul = $sc('#' + groupid + ' ul');
                if (!$ul.hasClass('_boc_group_closed')){
                    $img.attr('src', '/sitecore/shell/client/Speak/Assets/img/Speak/Common/16x16/dark_gray/navigate_down.png');
                    $ul.addClass('_boc_group_closed');
                } else {
                    $img.attr('src', '/sitecore/shell/client/Speak/Assets/img/Speak/Common/16x16/dark_gray/navigate_up.png');
                    $ul.removeClass('_boc_group_closed');
                }
            });
        }
        var $groupul = $sc('#' + groupid + ' ul');
        $groupul.append('<li><div id="' + renderingShortId + '" class="_boc_renderingItem"><img src="' + renderingItem.Icon + '" /><span>' + renderingItem.DisplayName + '</span></div></li>');
        
        $sc('#' + renderingShortId).draggable({
            revert: 'invalid',
            helper: 'clone', 
            appendTo: 'body',
            containment: 'window',
            stop: function() {topSitecore.PageModes.DesignManager.insertionEnd();},
            start: function(event){
                //workaround for scroll-offset-bug:http://stackoverflow.com/questions/5791886/jquery-draggable-shows-helper-in-wrong-place-after-page-scrolled
                $sc(this).data("startingScrollTop", $sc('body').scrollTop());
                
                event.stopImmediatePropagation();
                //hide all targets
                topSitecore.PageModes.DesignManager.insertionEnd();
                //show all targets
                topSitecore.PageModes.DesignManager.insertionStart();
                //now hide invalid ones
                $sc.each(topSitecore.PageModes.DesignManager.placeholders(), function(index, placeholder) {
                    if ($sc.inArray(renderingShortId, placeholder.data.custom.allowedRenderings) < 0){
                        placeholder.type.onHide();
                    }
                });
            },
            //workaround for scroll-offset-bug:http://stackoverflow.com/questions/5791886/jquery-draggable-shows-helper-in-wrong-place-after-page-scrolled
            drag: function(event,ui){
                var st = parseInt($sc(this).data("startingScrollTop"));
                ui.position.top -= st;
            }
        }).data('renderingItem', renderingItem);
    }
  };
});