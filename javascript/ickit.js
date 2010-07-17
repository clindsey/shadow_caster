(function(){
	var ICKit = Base.extend({
		constructor:function(bind_node_id, scene, raw_styles){
			var bind_node = MakeSeven("#" + bind_node_id),
					canvas_id = bind_node_id + "_canvas_kit",
					raw_styles = MakeSeven.extend({}, default_styles, raw_styles);
			var canvas_elem = ICKit.bind_to_node(canvas_id, bind_node);
			var display = new Display(canvas_elem.get(0), raw_styles);
			var timeline = new Timeline(scene, display),
					mouse = new Mouse(canvas_elem, display, this);
			this.extend({
				draw:function(){
					display.draw();
				},
				switch_scene:function(new_scene){
					timeline.switch_scene(new_scene);
				},
				mousemove:function(e){
					timeline.mousemove(e);
				},
				create_linear_gradient:function(x, y, width, height){
					return display.context.createLinearGradient(x, y, width, height);
				},
				add_background_gradient:function(gradient){
					display.background_gradient = gradient;
				}
			});
		}
	},{
		bind_to_node:function(canvas_id, bind_node){
			var canvas = document.createElement('canvas');
			bind_node.get(0).innerHTML = '';
			var node = bind_node.get(0).appendChild(canvas);
			canvas.id = canvas_id;
			canvas.width = bind_node.width();
			canvas.height = bind_node.height();
			if(MakeSeven.fn.is_ie() && G_vmlCanvasManager){
				G_vmlCanvasManager.initElement(node);
			};
			return MakeSeven("#" + canvas_id);
		}
	});
	var Canvas = Base.extend({
		constructor:function(canvas_elem){
			this.context = canvas_elem.getContext('2d');
			this.width = this.context.canvas.width;
			this.height = this.context.canvas.height;
			this.background_gradient = false;
		},
		clear:function(){
			this.context.canvas.width = this.context.canvas.width;
		},
		fill:function(color){
			this.context.save();
			this.context.fillStyle = color;
			this.context.fillRect(0, 0, this.width, this.height);
			this.context.restore();
		}
	});
	var Display = Canvas.extend({
		constructor:function(canvas_elem, style){
			this.base(canvas_elem);
			var display_list = new DisplayList(),
					display_grid = new DisplayGrid(this.width, this.height, 30);
			this.extend({
				draw:function(){
					this.clear();
					this.fill(style['background-color']);
					display_list.draw(this.context);
					display_grid.update();
				},
				destroy:function(){
					display_list.destroy();
					display_grid.destroy();
				},
				add:function(drawable){
					if(!drawable.depth) drawable.depth = display_list.highest_depth + 1;
					if(!drawable.__id__) drawable.__id__ = (Math.round(0xFFFFFFFFFFFF * Math.random()).toString(16) + "0000000000")
						.replace(/([a-f0-9]{12}).+/, "$1").toUpperCase();
					display_list.add(drawable);
					if(drawable.__is_interactive__) display_grid.add(drawable);
				},
				remove:function(drawable){
					display_list.remove(drawable);
					if(drawable.__is_interactive__) display_grid.remove(drawable);
				},
				swap_depth:function(drwaable, new_depth){
					display_list.swap_depth(drawable,new_depth);
				},
				to_top:function(drawable){
					display_list.swap_depth(drawable, display_list.highest_depth + 1);
				},
				get_nearby:function(point){
					return display_grid.get_nearby(point);
				},
				fill:function(color){
					this.base(color);
					if(!!this.background_gradient) this.base(this.background_gradient);
				}
			});
		}
	});
	var DisplayList = Base.extend({
		constructor:function(){
			this.highest_depth = -1;
			var lookup = {},
					drawables = [];
			this.extend({
				add:function(drawable){
					var i = drawable.depth;
					if(i > this.highest_depth) this.highest_depth = i;
					if(!drawables[i]) drawables[i] = [];
					var l = drawables[i].length;
					drawables[i][l] = drawable;
					lookup[drawable.__id__] = l;
				},
				remove:function(drawable){
					var l = lookup[drawable.__id__];
					delete lookup[drawable.__id__];
					if(l != null){
						drawables[drawable.depth][l].clear_bindings();
						drawables[drawable.depth][l] = null;
					};
				},
				update:function(){
					MakeSeven(drawables).each(function(){
						MakeSeven(this).each(function(){
							this.trigger('update',{});
						});
					});
				},
				draw:function(context){
					MakeSeven(drawables).each(function(){
						if(!this.length || this.length < 1) return;
						MakeSeven(this).each(function(){
							if(this.trigger) this.trigger('draw',context);
						});
					});
				},
				swap_depth:function(drawable, new_depth){
					var l = lookup[drawable.__id__];
					delete lookup[drawable.__id__];
					drawables[drawable.depth][l] = null;
					drawable.depth = new_depth;
					if(new_depth > this.highest_depth) this.highest_depth = new_depth;
					if(!drawables[new_depth]) drawables[new_depth] = [];
					var i = drawables[new_depth].length;
					drawables[new_depth][i] = drawable;
					lookup[drawable.__id__] = i;
				},
				destroy:function(){
					var self = this;
					MakeSeven(drawables).each(function(){
						if(!this.length || this.length < 1) return;
						MakeSeven(this).each(function(){
							self.remove(this);
						});
					});
					lookup = {};
					drawables = [];
				}
			});
		}
	});
	var DisplayGrid = Base.extend({
		constructor:function(stage_width, stage_height, grid_size){
			var grid_width = (stage_width / grid_size) << 0,
					displayables = {},
					positions = [];
			this.extend({
				destroy:function(){
				},
				add:function(displayable){
					displayables[displayable.__id__] = displayable;
				},
				remove:function(displayable){
					return delete(displayables[displayable.__id__]);
				},
				update:function(){
					var displayable,
							y,
							x,
							index,
							obj_grid_min_x,
							obj_grid_min_y,
							obj_grid_max_x,
							obj_grid_max_y,
							obj_grid_height,
							obj_grid_width,
							yl,
							xl;
					positions = [];
					for(var o in displayables){
						displayable = displayables[o];
						obj_grid_min_x = (displayable.min_x / grid_size) >> 0;
						obj_grid_min_y = (displayable.min_y / grid_size) >> 0;
						obj_grid_max_x = Math.ceil(displayable.max_x / grid_size);
						obj_grid_max_y = Math.ceil(displayable.max_y / grid_size);
						obj_grid_width = Math.ceil(obj_grid_max_x - obj_grid_min_x);
						obj_grid_height = Math.ceil(obj_grid_max_y - obj_grid_min_y);
						yl = obj_grid_min_y + obj_grid_height;
						xl = obj_grid_min_x + obj_grid_width;
						for(y = obj_grid_min_y; y < yl; y++){
							for(x = obj_grid_min_x; x < xl; x++){
								index = x + grid_width * y;
								if(!positions[index]) { positions[index] = [displayable]; continue; };
								positions[index][positions[index].length] = displayable;
							};
						};
					};
				},
				get_nearby:function(point){
					var x = (point.x / grid_size) >> 0,
							y = (point.y / grid_size) >> 0;
					var index = x + grid_width * y;
					return positions[index] || [];
				}
			});
		}
	});
	var Mouse = Base.extend({
		constructor:function(canvas_elem, display, ck_instance){
			var x = 0,
					y = 0,
					target,
					down = false,
					old_target,
					down_target;
			var self = this;
			var mouse_info = function(){
				return {'x':x,'y':y,'target':target,'down':down};
			};
			var get_target = function(){
				var target_candidate,
						contact,
						candidates = display.get_nearby({'x':x,'y':y});
				MakeSeven(candidates).each(function(){
					if(!this.visible) return;
					contact = DisplayObject.point_in_polygon({'x':x,'y':y},this);
					if(contact && !target_candidate){
						target_candidate = this;
					}else if(contact && target_candidate && this.depth > target_candidate.depth){
						target_candidate = this;
					};
				});
				return target_candidate;
			};
			canvas_elem.bind('mousemove',function(e){
				var offset = canvas_elem.offset();
				var offset_left = offset.left,
						offset_top = offset.top;
				if(MakeSeven.fn.is_ie()){
					if(document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)){
						x = e.clientX + document.documentElement.scrollLeft - offset_left;
						y = e.clientY + document.documentElement.scrollTop - offset_top;
					}else{
						x = e.clientX + document.body.scrollLeft - offset_left;
						y = e.clientY + document.body.scrollTop - offset_top;
					};
				}else{
					x = e.pageX - offset_left - 1;
					y = e.pageY - offset_top - 1;
				};
				if(target) old_target = target;
				target = get_target();
				if(target && !old_target){
					target_state = "mouseover";
					target.trigger('mouseover',mouse_info())
				}else if(target && old_target){
					if(target != old_target){
						if(down && down_target){
							target = down_target;
						}else{
							old_target.trigger('mouseout',mouse_info());
							target_state = 'mouseover';
							target.trigger('mouseover',mouse_info());
						};
					};
				}else if(!target && down && down_target){
					target = down_target;
				}else if(!target && old_target && !down){
					if(target_state == "mousedown") old_target.trigger("mouseup",mouse_info());
					old_target.trigger('mouseout',mouse_info());
					old_target = null;
					target_state = null;
				};
				if(target) target.trigger('mousemove',mouse_info());
				ck_instance.mousemove(mouse_info());
			});
			canvas_elem.bind('mouseup',function(e){
				if(target && target == old_target){
					target_state = 'mouseup';
					target.trigger("mouseup",mouse_info());
					old_target = null;
				};
				if(target && old_target && target == old_target){
					target_state = "mouseover";
					target.trigger("mouseover",mouse_info());
				};
				down = false;
			});
			canvas_elem.bind('mousedown',function(e){
				if(target){
					target_state = "mousedown";
					target.trigger("mousedown",mouse_info());
				}else if(!target && old_target){
					old_target.trigger("mouseup",mouse_info());
				};
				down = true;
				down_target = target;
			});
			canvas_elem.bind('mouseout',function(e){
				if(target && !MakeSeven.fn.is_ie()){
					target_state = "mouseout";
					target.trigger("mouseout",mouse_info());
				};
				down = false;
			});
		}
	});
	var Timeline = Base.extend({
		constructor:function(scene, display){
			this.width = display.width;
			this.height = display.height;
			this.extend({
				switch_scene:function(new_scene){
					if(this.scene) this.scene.destroy();
					this.__scene__ = new_scene;
					this.scene = new this.__scene__(this);
					this.scene.setup();
				},
				add:function(drawable){
					display.add(drawable);
				},
				remove:function(drawable){
					display.remove(drawable);
				},
				destroy:function(){
					display.destroy();
				},
				to_top:function(drawable){
					display.to_top(drawable);
				},
				mousemove:function(e){
					this.scene.mousemove(e);
				},
				mouseout:function(e){
					this.scene.mouseout(e);
				}
			});
			this.switch_scene(scene);
		}
	});
	/*
		Class: Scene
	*/
	var Scene = Base.extend({
		constructor:function(engine){
			this.width = engine.width;
			this.height = engine.height;
			this.extend({
				add:function(drawable){
					engine.add(drawable);
				},
				remove:function(drawable){
					engine.remove(drawable);
				},
				destroy:function(){
					engine.destroy();
				},
				draw:function(){
					engine.draw();
				},
				to_top:function(drawable){
					engine.to_top(drawable);
				}
			});
		},
		setup:function(){},
		mousemove:function(){},
		mouseout:function(){}
	});
	/*
		Class: EventDispatcher
		
		Base class for everything that dispatches events
	*/
	var EventDispatcher = Base.extend({
		constructor:function(){
			var lookup = {};
			var subscribers = {};
			this.extend({
				bind:function(type,fn){
					if(!subscribers[type]) subscribers[type] = [];
					var l = subscribers[type].length;
					subscribers[type][l] = fn;
					lookup[fn] = {'index':l,'type':type};
				},
				unbind:function(fn){
					var binding = lookup[fn];
					subscribers[binding.type][binding.index] = null;
					delete lookup[fn];
				},
				trigger:function(type,data){
					var self = this,
							args = MakeSeven.extend({'data':data},{'type':type});
					MakeSeven(subscribers[type]).each(function(){
						if(this.call) this.call(self, args);
					});
				},
				clear_bindings:function(){
					lookup = {};
					subscribers = {};
				}
			});
		}
	});
	/*
		Class: DisplayObject
		
		Base class for all items added to the display list
	*/
	var DisplayObject = EventDispatcher.extend({
		constructor:function(x, y, raw_styles){
			this.base();
			this.x = x;
			this.y = y;
			this.min_x;
			this.min_y;
			this.max_x;
			this.max_y;
			this.visible = true;
			this.vertices = [];
			this.__id__;
			this.depth;
			this.style = MakeSeven.extend({}, default_display_object_styles, raw_styles);
			var self = this;
			this.bind('update',function(e){});
			this.bind('draw',self.draw);
		},
		setup:function(){},
		add_vertex:function(vertex){
			var l = this.vertices.length;
			this.vertices[l] = vertex;
		},
		is_polygon:function(radius, edge_count, rotation){
			this.radius = radius;
			this.rotation = rotation;
			this.vertices = [];
			var point_index,
					point_increment = 360 / edge_count,
					plot_x,
					plot_y;
			for(point_index = 0; point_index <= 360; point_index += point_increment){
				plot_x = Math.sin(Math.convert_to_radians(point_index + this.rotation)) * radius;
				plot_y = Math.cos(Math.convert_to_radians(point_index + this.rotation)) * radius;
				this.add_vertex({'x':plot_x,'y':plot_y});
			};
		},
		is_rectangle:function(width, height){
			this.width = width;
			this.height = height;
			this.vertices = [];
			this.add_vertex({'x':0,'y':0});
			this.add_vertex({'x':this.width,'y':0});
			this.add_vertex({'x':this.width,'y':this.height});
			this.add_vertex({'x':0,'y':this.height});
		},
		draw:function(e){
			var graphics = e.data;
			if(!this.visible) return;
			graphics.save();
			graphics.translate(this.x, this.y);
			graphics.beginPath();
			graphics.fillStyle = this.style['background-color'];
			graphics.strokeStyle = this.style['border-color'];
			graphics.lineWidth = this.style['border-width'];
			this.min_x = null;
			this.min_y = null;
			this.max_x = null;
			this.max_y = null;
			var last_vertex = {'x':undefined,'y':undefined},
					v_l = this.vertices.length - 1;
			MakeSeven(this.vertices).each(function(i){
				if(i == 0){
					graphics.moveTo(this.x, this.y);
				}else{
					graphics.lineTo(this.x, this.y, last_vertex.x, last_vertex.y);
				};
				last_vertex = this;
			});
			if(last_vertex && this.vertices[0]){
				//graphics.lineTo(this.vertices[0].x, this.vertices[0].y, last_vertex.x, last_vertex.y);
			};
			graphics.fill();
			if(this.style['border-width'] > 0){
				graphics.stroke();
			};
			graphics.closePath();
			graphics.restore();
		}
	},{
		point_in_polygon:function(point, polygon){
			var x = point.x,
					y = point.y,
					vertices = polygon.vertices,
					i, j, vy, vx, vly, vlx,
					contact = false;
			var vert_count = vertices.length;
			for(i = 0, j = vert_count - 1; i< vert_count; j = i++){
				vy = vertices[i].y + polygon.y;
				vx = vertices[i].x + polygon.x;
				vly = vertices[j].y + polygon.y;
				vlx = vertices[j].x + polygon.x;
				if(((vy > y) != (vly > y)) && (x < (vlx - vx) * (y - vy) / (vly - vy) + vx)){
					contact = !contact;
				};
			};
			return contact;
		}
	});
	/*
		Class: InteractiveObject
		
		Base class for all display object that listen to mouse events
	*/
	var InteractiveObject = DisplayObject.extend({
		constructor:function(x, y, styles){
			this.base(x, y, styles);
			this.__is_interactive__ = true;
			var self = this;
			this.bind('draw',function(){
				MakeSeven(self.vertices).each(function(){
					if(!self.max_x || this.x + self.x > self.max_x) self.max_x = this.x + self.x;
					if(!self.min_x || this.x + self.x < self.min_x) self.min_x = this.x + self.x;
					if(!self.max_y || this.y + self.y > self.max_y) self.max_y = this.y + self.y;
					if(!self.min_y || this.y + self.y < self.min_y) self.min_y = this.y + self.y;
				});
			});
		}
	});
	/*
		Class: DisplayObjectContainer
		
		Base class for all objects that can serve as display object containers. Children are organized by depth
	*/
	var DisplayObjectContainer = InteractiveObject.extend({
	});
	/*
		Class: Sprite
		
		Basic display list node that can display graphics and also contain children
	*/
	var Sprite = DisplayObjectContainer.extend({
	});
	/*
		Class: StackElement
		
		setting height,width to auto is known to be buggy
	*/
	var StackElement = DisplayObject.extend({
		constructor:function(stage, x, y, width, height, style){
			this.stage = stage;
			this.base(x, y, style);
			this.is_rectangle(width, height);
			this.id;
			this.classes = [];
			this.child_offset_left = 0,
			this.child_offset_top = 0;
			this.children = [];
			this.component;
			this.extend({
				get_element_by_id:function(id){
					if(this.id == id) return this;
					var found = false,
							elem;
					MakeSeven(this.children).each(function(){
						if(found) return;
						if(this.id && this.id == id){
							elem = this;
							found = true;
						}else{
							elem = this.get_element_by_id(id);
							found = !!elem;
						};
					});
					return found ? elem : false;
				},
				get_elements_by_class:function(class_){
					var elem,
							results = [];
					MakeSeven(this.children).each(function(){
						if(this.classes && MakeSeven.inArray(class_, this.classes) > -1){
							results = results.concat([this]);
						};
						results = results.concat(this.get_elements_by_class(class_));
					});
					return results;
				},
				add_component:function(component, args){
					if(this.component) this.stage.remove(this.component);
					this.__component__ = component;
					this.component = new this.__component__(this, args);
					this.stage.add(this.component);
					return this.component;
				},
				remove_component:function(){
					if(this.component) this.stage.remove(this.component);
					this.component = null;
				},
				add_element:function(dom, styles){
					var gather_styles = function(elem){
							var id = elem['id'],
									class_ = elem['class'],
									collected_styles = {},
									c;
							MakeSeven.extend(collected_styles, default_element_styles);
							var classes = class_ ? class_.match(/\w+/ig) : [];
							MakeSeven(classes).each(function(){
								c = styles['.' + this];
								MakeSeven.extend(collected_styles, c)
							});
							MakeSeven.extend(collected_styles, styles['#' + id] || {});
							return {'styles':collected_styles,'id':id,'classes':classes};
						};
					var dom_meta = gather_styles(dom);
					this.id = this.id || dom_meta.id;
					this.classes = this.classes || dom_meta.classes;
					var elem_styles,
							self = this,
							elem_width,
							elem_height,
							elem_node,
							last_elem,
							elem_meta,
							queue = [],
							available_width = this.width,
							available_height = this.height,
							auto_width_count = 0,
							auto_height_count = 0;
					MakeSeven(dom.children).each(function(){
						elem_meta = gather_styles(this);
						elem_styles = elem_meta.styles;
						elem_height = (parseFloat(elem_styles.height) / 100) * self.height;
						if(elem_styles.width == "auto"){
							elem_width = "auto";
							auto_width_count++;
						}else{
							if(elem_styles.width.indexOf('%') > -1){
								elem_width = (parseFloat(elem_styles.width) / 100) * self.width;
							}else{
								elem_width = parseFloat(elem_styles.width);
							};
							available_width -= elem_width;
						};
						if(elem_styles.height == "auto"){
							elem_height = "auto";
							auto_height_count++;
						}else{
							if(elem_styles.height.indexOf('%') > -1){
								elem_height = (parseFloat(elem_styles.height) / 100) * self.height;
							}else{
								elem_height = parseFloat(elem_styles.height);
							};
							available_height -= elem_height;
						};
						last_elem = {'width':elem_width,'height':elem_height,'id':elem_meta.id,'classes':elem_meta.classes,'dom':this};
						queue[queue.length] = last_elem;
					});
					var auto_width = available_width / auto_width_count,
							auto_height = available_height / auto_height_count;
							width,
							height;
					MakeSeven(queue).each(function(){
						if(this.width == "auto"){ this.width = auto_width; };
						if(this.height == "auto"){ this.height = auto_height; };
						if(self.child_offset_left + this.width > self.width + 0.000001){ //  + 0.000001 because of rounding issues
							self.child_offset_left = 0;
							self.child_offset_top += last_elem.height;
						};
						elem_node = new StackElement(stage, self.x + self.child_offset_left, self.y + self.child_offset_top, this.width, this.height, self.style);
						elem_node.id = this.id;
						elem_node.classes = this.classes;
						self.children[self.children.length] = elem_node;
						self.child_offset_left += this.width;
						stage.add(elem_node);
						elem_node.add_element(this.dom, styles);
						last_elem = this;
					});
				}
			});
		}
	});
	/*
		Class: Text
		
		Base class for display objects with simple static text
	*/
	var Text = InteractiveObject.extend({
		constructor:function(x, y, width, height, text, styles){
			this.base(x, y, styles);
			this.is_rectangle(width, height);
			this.text = text;
			var style = this.style;
			var font_ascent = function(){
				return style['font-size'] * 0.75;
			};
			var font_descent = function(){
				return 7.0 * style['font-size'] / 25.0;
			};
			var measure_text = function(){
				var total = 0;
				var len = text.length;
				var i, c;
				for(i = 0; i < len; i++){
					c = letter(text.charAt(i));
					if(!c) c= {'width':13};
					total += c.width * style['font-size'] / 25.0;
				};
				return total;
			};
			var letter = function(ch){
				return Text.letters_meta[ch];
			};
			var draw_text = function(graphics, x, y){
				var font = style['font-family'],
						size = style['font-size'],
						color = style['color'],
						font_width = style['font-width'],
						total = 0,
						c, i, j, a,
						pen_up, need_stroke;
				var len = text.length;
				var mag = size / 25.0;
				graphics.save();
				graphics.fillStyle = color;
				graphics.strokeStyle = color;
				graphics.lineWidth = font_width;
				graphics.font = (size + "px") + " " + font;
				for(i = 0; i < len; i++){
					c = letter(text.charAt(i));
					if(c){
						graphics.beginPath();
						pen_up = 1;
						need_stroke = 0;
						for(j = 0; j < c.points.length; j++){
							a = c.points[j];
							if(a[0] == -1 && a[1] == -1){
								pen_up = 1;
								continue;
							};
							if(pen_up){
								graphics.moveTo(x + a[0] * mag, y - a[1] * mag);
								pen_up = false;
							}else{
								graphics.lineTo(x + a[0] * mag, y - a[1] * mag);
							};
						};
						graphics.stroke();
						graphics.closePath();
						x += c.width * mag;
					}else{
						if(graphics.fillText){
							graphics.fillText(text.charAt(i), x, y);
						}else if(graphics.mozDrawText){
							graphics.translate(x, y);
							graphics.mozDrawText(text.chartAt(i));
							graphics.translate(0 - x, 0 - y);
						};
						x += 16 * mag;
					};
				};
				graphics.restore();
				return total;
			};
			var draw_text_right = function(graphics, x, y){
				var w = measure_text();
				return draw_text(graphics, x - w, y);
			};
			var draw_text_center = function(graphics, x, y){
				var w = measure_text();
				return draw_text(graphics, x - w / 2, y);
			};
			var self = this;
			this.bind('draw',function(e){
				var graphics = e.data;
				var ascent = font_ascent();
				switch(style['text-align']){
					case 'center':
						draw_text_center(graphics, this.x + this.width / 2, this.y + (this.height / 2) + (ascent / 2));
						break;
					case 'right':
						draw_text_right(graphics, this.x + this.width, this.y + (this.height / 2) + (ascent / 2));
						break;
					default:
						draw_text(graphics, this.x, this.y + (this.height / 2) + (ascent / 2));
						break;
				};
			});
		}
	},{
		letters_meta:{
			' ': { width: 16, points: [] },
			'!': { width: 10, points: [[5,21],[5,7],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
			'"': { width: 16, points: [[4,21],[4,14],[-1,-1],[12,21],[12,14]] },
			'#': { width: 21, points: [[11,25],[4,-7],[-1,-1],[17,25],[10,-7],[-1,-1],[4,12],[18,12],[-1,-1],[3,6],[17,6]] },
			'$': { width: 20, points: [[10,25],[10,-4],[-1,-1],[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
			'%': { width: 24, points: [[21,21],[3,0],[-1,-1],[8,21],[10,19],[10,17],[9,15],[7,14],[5,14],[3,16],[3,18],[4,20],[6,21],[8,21],[10,20],[13,19],[16,19],[19,20],[21,21],[-1,-1],[17,7],[15,6],[14,4],[14,2],[16,0],[18,0],[20,1],[21,3],[21,5],[19,7],[17,7]] },
			'&': { width: 26, points: [[23,12],[23,13],[22,14],[21,14],[20,13],[19,11],[17,6],[15,3],[13,1],[11,0],[7,0],[5,1],[4,2],[3,4],[3,6],[4,8],[5,9],[12,13],[13,14],[14,16],[14,18],[13,20],[11,21],[9,20],[8,18],[8,16],[9,13],[11,10],[16,3],[18,1],[20,0],[22,0],[23,1],[23,2]] },
			'\'': { width: 10, points: [[5,19],[4,20],[5,21],[6,20],[6,18],[5,16],[4,15]] },
			'(': { width: 14, points: [[11,25],[9,23],[7,20],[5,16],[4,11],[4,7],[5,2],[7,-2],[9,-5],[11,-7]] },
			')': { width: 14, points: [[3,25],[5,23],[7,20],[9,16],[10,11],[10,7],[9,2],[7,-2],[5,-5],[3,-7]] },
			'*': { width: 16, points: [[8,21],[8,9],[-1,-1],[3,18],[13,12],[-1,-1],[13,18],[3,12]] },
			'+': { width: 26, points: [[13,18],[13,0],[-1,-1],[4,9],[22,9]] },
			',': { width: 10, points: [[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
			'-': { width: 26, points: [[4,9],[22,9]] },
			'.': { width: 10, points: [[5,2],[4,1],[5,0],[6,1],[5,2]] },
			'/': { width: 22, points: [[20,25],[2,-7]] },
			'0': { width: 20, points: [[9,21],[6,20],[4,17],[3,12],[3,9],[4,4],[6,1],[9,0],[11,0],[14,1],[16,4],[17,9],[17,12],[16,17],[14,20],[11,21],[9,21]] },
			'1': { width: 20, points: [[6,17],[8,18],[11,21],[11,0]] },
			'2': { width: 20, points: [[4,16],[4,17],[5,19],[6,20],[8,21],[12,21],[14,20],[15,19],[16,17],[16,15],[15,13],[13,10],[3,0],[17,0]] },
			'3': { width: 20, points: [[5,21],[16,21],[10,13],[13,13],[15,12],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
			'4': { width: 20, points: [[13,21],[3,7],[18,7],[-1,-1],[13,21],[13,0]] },
			'5': { width: 20, points: [[15,21],[5,21],[4,12],[5,13],[8,14],[11,14],[14,13],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
			'6': { width: 20, points: [[16,18],[15,20],[12,21],[10,21],[7,20],[5,17],[4,12],[4,7],[5,3],[7,1],[10,0],[11,0],[14,1],[16,3],[17,6],[17,7],[16,10],[14,12],[11,13],[10,13],[7,12],[5,10],[4,7]] },
			'7': { width: 20, points: [[17,21],[7,0],[-1,-1],[3,21],[17,21]] },
			'8': { width: 20, points: [[8,21],[5,20],[4,18],[4,16],[5,14],[7,13],[11,12],[14,11],[16,9],[17,7],[17,4],[16,2],[15,1],[12,0],[8,0],[5,1],[4,2],[3,4],[3,7],[4,9],[6,11],[9,12],[13,13],[15,14],[16,16],[16,18],[15,20],[12,21],[8,21]] },
			'9': { width: 20, points: [[16,14],[15,11],[13,9],[10,8],[9,8],[6,9],[4,11],[3,14],[3,15],[4,18],[6,20],[9,21],[10,21],[13,20],[15,18],[16,14],[16,9],[15,4],[13,1],[10,0],[8,0],[5,1],[4,3]] },
			':': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
			',': { width: 10, points: [[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
			'<': { width: 24, points: [[20,18],[4,9],[20,0]] },
			'=': { width: 26, points: [[4,12],[22,12],[-1,-1],[4,6],[22,6]] },
			'>': { width: 24, points: [[4,18],[20,9],[4,0]] },
			'?': { width: 18, points: [[3,16],[3,17],[4,19],[5,20],[7,21],[11,21],[13,20],[14,19],[15,17],[15,15],[14,13],[13,12],[9,10],[9,7],[-1,-1],[9,2],[8,1],[9,0],[10,1],[9,2]] },
			'@': { width: 27, points: [[18,13],[17,15],[15,16],[12,16],[10,15],[9,14],[8,11],[8,8],[9,6],[11,5],[14,5],[16,6],[17,8],[-1,-1],[12,16],[10,14],[9,11],[9,8],[10,6],[11,5],[-1,-1],[18,16],[17,8],[17,6],[19,5],[21,5],[23,7],[24,10],[24,12],[23,15],[22,17],[20,19],[18,20],[15,21],[12,21],[9,20],[7,19],[5,17],[4,15],[3,12],[3,9],[4,6],[5,4],[7,2],[9,1],[12,0],[15,0],[18,1],[20,2],[21,3],[-1,-1],[19,16],[18,8],[18,6],[19,5]] },
			'A': { width: 18, points: [[9,21],[1,0],[-1,-1],[9,21],[17,0],[-1,-1],[4,7],[14,7]] },
			'B': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[-1,-1],[4,11],[13,11],[16,10],[17,9],[18,7],[18,4],[17,2],[16,1],[13,0],[4,0]] },
			'C': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5]] },
			'D': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[11,21],[14,20],[16,18],[17,16],[18,13],[18,8],[17,5],[16,3],[14,1],[11,0],[4,0]] },
			'E': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11],[-1,-1],[4,0],[17,0]] },
			'F': { width: 18, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11]] },
			'G': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[18,8],[-1,-1],[13,8],[18,8]] },
			'H': { width: 22, points: [[4,21],[4,0],[-1,-1],[18,21],[18,0],[-1,-1],[4,11],[18,11]] },
			'I': { width: 8, points: [[4,21],[4,0]] },
			'J': { width: 16, points: [[12,21],[12,5],[11,2],[10,1],[8,0],[6,0],[4,1],[3,2],[2,5],[2,7]] },
			'K': { width: 21, points: [[4,21],[4,0],[-1,-1],[18,21],[4,7],[-1,-1],[9,12],[18,0]] },
			'L': { width: 17, points: [[4,21],[4,0],[-1,-1],[4,0],[16,0]] },
			'M': { width: 24, points: [[4,21],[4,0],[-1,-1],[4,21],[12,0],[-1,-1],[20,21],[12,0],[-1,-1],[20,21],[20,0]] },
			'N': { width: 22, points: [[4,21],[4,0],[-1,-1],[4,21],[18,0],[-1,-1],[18,21],[18,0]] },
			'O': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21]] },
			'P': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,14],[17,12],[16,11],[13,10],[4,10]] },
			'Q': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21],[-1,-1],[12,4],[18,-2]] },
			'R': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[4,11],[-1,-1],[11,11],[18,0]] },
			'S': { width: 20, points: [[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
			'T': { width: 16, points: [[8,21],[8,0],[-1,-1],[1,21],[15,21]] },
			'U': { width: 22, points: [[4,21],[4,6],[5,3],[7,1],[10,0],[12,0],[15,1],[17,3],[18,6],[18,21]] },
			'V': { width: 18, points: [[1,21],[9,0],[-1,-1],[17,21],[9,0]] },
			'W': { width: 24, points: [[2,21],[7,0],[-1,-1],[12,21],[7,0],[-1,-1],[12,21],[17,0],[-1,-1],[22,21],[17,0]] },
			'X': { width: 20, points: [[3,21],[17,0],[-1,-1],[17,21],[3,0]] },
			'Y': { width: 18, points: [[1,21],[9,11],[9,0],[-1,-1],[17,21],[9,11]] },
			'Z': { width: 20, points: [[17,21],[3,0],[-1,-1],[3,21],[17,21],[-1,-1],[3,0],[17,0]] },
			'[': { width: 14, points: [[4,25],[4,-7],[-1,-1],[5,25],[5,-7],[-1,-1],[4,25],[11,25],[-1,-1],[4,-7],[11,-7]] },
			'\\': { width: 14, points: [[0,21],[14,-3]] },
			']': { width: 14, points: [[9,25],[9,-7],[-1,-1],[10,25],[10,-7],[-1,-1],[3,25],[10,25],[-1,-1],[3,-7],[10,-7]] },
			'^': { width: 16, points: [[6,15],[8,18],[10,15],[-1,-1],[3,12],[8,17],[13,12],[-1,-1],[8,17],[8,0]] },
			'_': { width: 16, points: [[0,-2],[16,-2]] },
			'`': { width: 10, points: [[6,21],[5,20],[4,18],[4,16],[5,15],[6,16],[5,17]] },
			'a': { width: 19, points: [[15,14],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'b': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
			'c': { width: 18, points: [[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'd': { width: 19, points: [[15,21],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'e': { width: 18, points: [[3,8],[15,8],[15,10],[14,12],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'f': { width: 12, points: [[10,21],[8,21],[6,20],[5,17],[5,0],[-1,-1],[2,14],[9,14]] },
			'g': { width: 19, points: [[15,14],[15,-2],[14,-5],[13,-6],[11,-7],[8,-7],[6,-6],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'h': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
			'i': { width: 8, points: [[3,21],[4,20],[5,21],[4,22],[3,21],[-1,-1],[4,14],[4,0]] },
			'j': { width: 10, points: [[5,21],[6,20],[7,21],[6,22],[5,21],[-1,-1],[6,14],[6,-3],[5,-6],[3,-7],[1,-7]] },
			'k': { width: 17, points: [[4,21],[4,0],[-1,-1],[14,14],[4,4],[-1,-1],[8,8],[15,0]] },
			'l': { width: 8, points: [[4,21],[4,0]] },
			'm': { width: 30, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0],[-1,-1],[15,10],[18,13],[20,14],[23,14],[25,13],[26,10],[26,0]] },
			'n': { width: 19, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
			'o': { width: 19, points: [[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3],[16,6],[16,8],[15,11],[13,13],[11,14],[8,14]] },
			'p': { width: 19, points: [[4,14],[4,-7],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
			'q': { width: 19, points: [[15,14],[15,-7],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
			'r': { width: 13, points: [[4,14],[4,0],[-1,-1],[4,8],[5,11],[7,13],[9,14],[12,14]] },
			's': { width: 17, points: [[14,11],[13,13],[10,14],[7,14],[4,13],[3,11],[4,9],[6,8],[11,7],[13,6],[14,4],[14,3],[13,1],[10,0],[7,0],[4,1],[3,3]] },
			't': { width: 12, points: [[5,21],[5,4],[6,1],[8,0],[10,0],[-1,-1],[2,14],[9,14]] },
			'u': { width: 19, points: [[4,14],[4,4],[5,1],[7,0],[10,0],[12,1],[15,4],[-1,-1],[15,14],[15,0]] },
			'v': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0]] },
			'w': { width: 22, points: [[3,14],[7,0],[-1,-1],[11,14],[7,0],[-1,-1],[11,14],[15,0],[-1,-1],[19,14],[15,0]] },
			'x': { width: 17, points: [[3,14],[14,0],[-1,-1],[14,14],[3,0]] },
			'y': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0],[6,-4],[4,-6],[2,-7],[1,-7]] },
			'z': { width: 17, points: [[14,14],[3,0],[-1,-1],[3,14],[14,14],[-1,-1],[3,0],[14,0]] },
			'{': { width: 14, points: [[9,25],[7,24],[6,23],[5,21],[5,19],[6,17],[7,16],[8,14],[8,12],[6,10],[-1,-1],[7,24],[6,22],[6,20],[7,18],[8,17],[9,15],[9,13],[8,11],[4,9],[8,7],[9,5],[9,3],[8,1],[7,0],[6,-2],[6,-4],[7,-6],[-1,-1],[6,8],[8,6],[8,4],[7,2],[6,1],[5,-1],[5,-3],[6,-5],[7,-6],[9,-7]] },
			'|': { width: 8, points: [[4,25],[4,-7]] },
			'}': { width: 14, points: [[5,25],[7,24],[8,23],[9,21],[9,19],[8,17],[7,16],[6,14],[6,12],[8,10],[-1,-1],[7,24],[8,22],[8,20],[7,18],[6,17],[5,15],[5,13],[6,11],[10,9],[6,7],[5,5],[5,3],[6,1],[7,0],[8,-2],[8,-4],[7,-6],[-1,-1],[8,8],[6,6],[6,4],[7,2],[8,1],[9,-1],[9,-3],[8,-5],[7,-6],[5,-7]] },
			'~': { width: 24, points: [[3,6],[3,8],[4,11],[6,12],[8,12],[10,11],[14,8],[16,7],[18,7],[20,8],[21,10],[-1,-1],[3,8],[4,10],[6,11],[8,11],[10,10],[14,7],[16,6],[18,6],[20,7],[21,10],[21,12]] }
		}
	});
	MakeSeven.extend(Math,{
		convert_to_radians:function(degrees){
			return Math.PI / 180 * degrees;
		},
		convert_to_degrees:function(radians){
			return radians * (180 / Math.PI);
		}
	});
	var default_styles = {
			'background-color':'#FFFFFF'
		};
	var default_display_object_styles = {
			'background-color':'rgba(255, 255, 255, 0)',
			'border-width':0,
			'border-color':'rgba(0, 0, 0, 0)',
			'font-family':'sans-serif',
			'font-size':16,
			'color':'#000000',
			'text-align':'left',
			'font-width':1
		};
	var default_element_styles = {
			'width':'100%',
			'height':'100%'
		};
	ICKit.Scene = Scene;
	ICKit.DisplayObject = DisplayObject;
	ICKit.InteractiveObject = InteractiveObject;
	//ICKit.DisplayObjectContainer = DisplayObjectContainer;
	//ICKit.Sprite = Sprite;
	ICKit.Text = Text;
	ICKit.StackElement = StackElement;
	window.ICKit = ICKit;
})();