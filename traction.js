/**
 * Core UI components for the Traction framework. Also includes some boilerplate
 * and bootstrap code
 * 
 * @author rnorris
 */

// fix up underscore templates to play nice (bootstrap)
_.templateSettings = {
	interpolate : /\{\{(.+?)\}\}/g
};

var Traction = {};;

Traction._apiUrl = "";

Traction.Utility = (function() {
	var eventBus = function() {
		return _.extend({}, Backbone.Events)
	};

	return {
		EventBus : eventBus
	};
})();

Traction.Model = (function() {

	/**
	 * A base class for querying server-side models.
	 */
	var baseModel = Backbone.Model.extend({
		errors : undefined,

		initialize : function(attributes) {
			this.errors = new Traction.Collection.Errors();
		},

		/*
		url : function() {
			var base = Traction._apiUrl + "/" + this.simpleName;

			if (this.queryString) {
				base += "?" + this.queryString;
			}

			return base;
		},
		*/

		parse : function(data) {
			if (data.errors) {
				this.reset(data.errors);
			} else {
				this.clear();
			}
			
			if(this.subelement) {
				return data[this.subelement];
			} else {
				return data;
			}
			
		},

		query : function(params, successCallback, failureCallback) {
			var keyPairs = [];

			for ( var param in params) {
				keyPairs.push(param + "=" + params[param]);
			}

			this.queryString = keyPairs.join("&");

			this.fetch({
				success : successCallback,
				failure : failureCallback
			});
		}
	});

	var error = Backbone.Model.extend({});

	return {
		BaseModel : baseModel,
		Error : error
	};
})();

Traction.Collection = (function() {

	var baseCollection = Backbone.Collection.extend({
		
		url : function() {
			var base = Traction._apiUrl + "/" + this.simpleName;

			if (this.queryString) {
				base += "?" + this.queryString;
			}

			return base;
		},

		query : function(params, successCallback, failureCallback) {
			var keyPairs = [];

			for ( var param in params) {
				keyPairs.push(param + "=" + params[param]);
			}

			this.queryString = keyPairs.join("&");

			this.fetch({
				success : successCallback,
				failure : failureCallback
			});
		}
	});

	var errors = Backbone.Collection.extend({
		model : Traction.Model.Error
	});

	return {
		BaseCollection : baseCollection,
		Errors : errors
	};
})();

Traction.View = (function() {
	/**
	 * Base class for all views. Useful for common behaviors or interception
	 * logic.
	 */
	var baseView = Backbone.View.extend({
		initialize : function(options) {
			_.bindAll(this, "postInitialize", "renderErrors");
			_.extend(this, Backbone.Events);

			// this.postInitialize(options);

			// default error rendering
			if (this.model) {
				if (this.model.errors) {
					this.model.errors.on("reset", this.renderErrors);
				}
			}
		},

		/**
		 * default error rendering behavior, override in subclasses
		 */
		renderErrors : function(errors) {
			// implement with your base case
		},

		/**
		 * Post construction overrides
		 */
		postInitialize : function(options) {
		},

		// a series of abstractions for intercepting visibility behaviors
		/**
		 * Called prior to showing making this control visible. Designed to be
		 * overridden by subclasses.
		 */
		beforeShow : function() {
		},

		/**
		 * Like beforeShow, only different.
		 */
		afterShow : function() {
		},

		/**
		 * Like before show, only for before hiding.
		 */
		beforeHide : function() {
		},

		/**
		 * You know the deal
		 */
		afterHide : function() {
		},

		/**
		 * Utility to make the control visible. Basically an overload of the
		 * JQuery UI .show method
		 */
		show : function(affect, options, speed, callback) {
			this.trigger("show");
			this.beforeShow();

			if (affect) {
				$(this.el).show(affect, options, speed, callback);
			} else {
				$(this.el).show();
			}

			this.trigger("shown");
			this.afterShow();
		},

		/**
		 * Utility to make the control invvisible. Basically an overload of the
		 * JQuery UI .hide method
		 */
		hide : function(affect, options, speed, callback) {
			this.trigger("hide");
			this.beforeHide();

			if (affect) {
				$(this.el).hide(affect, options, speed, callback);
			} else {
				$(this.el).hide();
			}

			this.trigger("hidden");
			this.afterHide();
		}

	});

	var tableRowRenderer = baseView.extend({

		postInitialize : function(options) {
			_.bindAll(this, "render", "setUpModel");

			if (this.model) {
				this.setUpModel(this.model);
			}

			this.repeater = options.repeater;
			this.customize(options);
		},

		customize : function(options) {

		},

		setUpModel : function(model) {
			this.model = model;

			if (this.model) {
				this.model.on("change", this.render);
			}
		},

		render : function() {
			this.setElement(this.template(this.model.toJSON()));
			return this;
		}
	});

	/**
	 * A repeater is a utility control designed to take a collection and render
	 * it within a class described as an itemRenderer. The itemRenderer class
	 * must implement View#render and return the rendered element
	 */
	var repeater = baseView.extend({

		itemRenderer : null,

		postInitialize : function(options) {
			_.bindAll(this, "render");

			if (this.collection) {
				this.setUpModel(this.collection);
			}

			this.customize(options);
		},

		customize : function(options) {

		},

		setUpModel : function(collection) {
			this.collection = collection;

			if (this.collection) {
				this.collection.bind("all", this.render);
			}
		},

		render : function() {
			var self = this;

			if (this.collection.length > 0) {
				$(this.el).children(".nodata").hide();
			} else {
				$(this.el).children(".nodata").show();
			}

			$(this.el).children(":not(.nodata)").remove();

			this.collection.each(function(item) {
				var renderer = new self.itemRenderer({
					model : item,
					repeater : self
				});

				var renderedItem = renderer.render();

				$(renderedItem.el).appendTo(self.el);
				renderedItem.delegateEvents();
			});

			return this;
		}

	});

	var table = repeater.extend({

	});

	var modal = baseView.extend({
		title : function(title) {
			$('.modal-header > .title').text(title);
			return this;
		},

		postInitialize : function(options) {
			_.bindAll(this, "customize", "title");

			var self = this;

			$(this.el).on("show", function() {
				self.trigger("show");
			});

			$(this.el).on("shown", function() {
				self.trigger("shown");
			});

			$(this.el).on("hide", function() {
				self.trigger("hide");
			});

			$(this.el).on("hidden", function() {
				self.trigger("hidden");
			});
			this.customize(options);
		},

		/**
		 * We override initialize to handle the modal events, so this will give
		 * subclasses some way of hooking into object construction
		 */
		customize : function(options) {

		},

		show : function() {
			$(this.el).children('h3.title').text(this.title);
			$(this.el).modal('show');
			return this;
		},

		hide : function() {
			$(this.el).modal('hide');
			return this;
		}
	});

	return {
		BaseView : baseView,
		Repeater : repeater,
		TableRowRenderer : tableRowRenderer,
		Modal : modal
	};

})();