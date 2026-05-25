/*!
  To learn more about how to write your Action, see the following documentation:
  http://go.microsoft.com/fwlink/?LinkId=313673
*/
(function (VS) {
	"use strict";

	VS.Namespace.defineWithParent(VS, "Actions", {
		///	<signature type="Action" name="CustomAction">
		///		<description>An empty action.</description>
		///
		///		<!-- Mandatory properties. -->
		///		<property name="type" datatype="String" required="true">
		///			The type of the action.
		///		</property>
		///		<!-- Mandatory properties. -->
		///
		///		<!-- Add new properties below this line. -->
		///
		///		<!-- Example for myProperty -->
		///		<property name="myProperty" datatype="Number" isInteger="true" defaultValue="10" minimum="0" maximum="100" required="true">
		///			A sample description
		///		</property>
		///	</signature>
		CustomAction: VS.Class.derive(VS.Actions.ActionBase,
				function CustomAction_ctor() {
					// Add initialization code here.
				},
				{
					myProperty: 10,

					execute: function (element, behaviorData) {
						/// <summary locid="VS.Actions.CustomAction.execute">
						/// Executes action for one element. Derived Actions must override this. 
						/// </summary>
						/// <param name="element" type="Object" domElement="true" locid="VS.Actions.CustomAction.execute_p:element">
						/// An element on which this action should be executed.
						/// </param>
						/// <param name="behaviorData" type="Object" locid="VS.Actions.CustomAction.execute_p:behaviorData">
						/// Optional info provided by Behaviors. For example EventTriggerBehavior uses it to pass event.
						/// </param>

						// Trace diagnostic message. Remove if not needed.
						// To turn traces on add following script to your HTML page:
						//   <script> VS.Util.isTraceEnabled = true; </script>
						VS.Util.trace("VS.Actions.CustomAction: <{0} uid={1}>, myProperty={2}", element.tagName, element.uniqueID, this.myProperty);

						// Specific Behaviors can provide additional info via 'behaviorData' parameter.
						// For if this action is owned by an EventTriggerBehavior which fires
						// on click then you can access that event like this:
						//   var event = behaviorData.event;
						// If you are not sure if this action was invoked by EventTriggerBehavior
						// then you can use some care and access event object like this:
						//   var event = null;
						//   if (behaviorData && behaviorData.event) { event = behaviorData.event; }

						// TODO: perform some action.
						console.log("CustomAction not implemented");
						throw new Error("CustomAction not implemented");
					},

					getTargetElements: function (targetElements) {
						/// <summary locid="VS.Actions.CustomAction.getTargetElements">
						/// This is your chance to modify collection of target elements to execute an action on.
						/// </summary>
						/// <param name="targetElements" type="Array" locid="VS.Actions.CustomAction.executeAll_p:array">
						/// A collection of elements on which this action should be executed. This collection is constructed
						/// by onwer Behavior object. It takes into account such Behavior details as attached elements and
						/// source selector. It does NOT take into account action specific details such as action target selector.
						/// </param>

						// TODO: modify target elements or remove this method.
						return VS.Actions.ActionBase.prototype.getTargetElements.call(this, targetElements);
					},
				},

				{ /* static members empty */ },

				{
					// Mandatory property metadata.
					type: { type: String },

					// For every new property added as <signature>/<property>, add its metadata here.
					//
					// Example:
					// -----------------
					myProperty: { type: Number }
				}
		)
	});
})(VS);