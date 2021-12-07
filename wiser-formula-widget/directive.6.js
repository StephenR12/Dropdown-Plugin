// FIXME: Repeated from `widget.6.js`
const PANEL_FILTER_DIMENSION = 'Filter Dimension';

mod.directive('wiserFormulaWidget', ['$animate', function($animate) {
  return {
    restrict: 'E',
    replace: false,
    transclude: false,
    templateUrl: '/plugins/WiserFormulaWidget/wiser-formula-widget/template.b4786426a61a9f8f87375810244c92cd.html',

    link($scope, $element, _attrs) {
      let { widget } = $scope;

      $scope.dropdownOpen = false;

      $scope.filterText = '';
      $scope.title = 'Filter';

      $scope.toggleDropdown = function() {
        if ($scope.dropdownOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }
      };

      function openDropdown() {
        $scope.dropdownOpen = true;

        let $widget = $(`widget[widgetid=${widget.oid}]`);

        $widget.css({ zIndex: 100, overflow: 'visible' });

        // Focus the filter input
        window.setTimeout(() => $element.find('input').focus());
      }

      function closeDropdown() {
        $scope.dropdownOpen = false;

        let $widget = $(`widget[widgetid=${widget.oid}]`);
        $widget.css({ zIndex: '', overflow: '' });
        $scope.filterText = '';
        $scope.windowSize = 50;
      }

      widget.on('ready', updateSelection);
      prism.activeDashboard.on('filterschanged', updateSelection);

      function updateSelection() {
        if ($scope.appstate === 'widget') { return; }

        let dimensionPanel = widget.metadata.panel(PANEL_FILTER_DIMENSION);
        let filterDimension = dimensionPanel.items[0];

        let dbFilterItems = prism.activeDashboard.filters.$$items;
        let relevantFilter = dbFilterItems.find(function (filter) {
          return !filter.disabled &&
                 filter.jaql.dim === filterDimension.jaql.dim;
        });

        let selectedItems = (relevantFilter && relevantFilter.jaql.filter.members) || [];

        $scope.originalSelection = selectedItems.sort();
        $scope.selectedItems = [].concat($scope.originalSelection);

        updateApply();
        updateSelectAll();
        updateTitle();
      }

      function updateTitle() {
        let dimensionPanel = widget.metadata.panel(PANEL_FILTER_DIMENSION);
        let filterDimension = dimensionPanel.items[0];

        if ($scope.appstate === 'widget') {
          $scope.title = filterDimension ? filterDimension.jaql.title : 'Filter';
          return;
        }

        let selectedCount = ($scope.originalSelection || []).length;

        if (selectedCount) {
          $scope.title = $scope.originalSelection.join(', ');
        } else {
          $scope.title = filterDimension.jaql.title;
        }
      }

      widget.on('ready', updateItems);

      function updateItems() {
        $scope.items = widget.queryResult;
        $scope.windowSize = 50;
      }

      $scope.growScrollWindow = function() {
        if ($scope.windowSize < $scope.items.length) {
          $scope.windowSize += 50;
        }
      };

      $scope.isSelected = function(row) {
        return ($scope.selectedItems || []).indexOf(row.toString()) > -1;
      };

      $scope.select = function(item) {
        if ($scope.appstate !== 'dashboard') { return; }

        let itemData = item.data.toString();

        if (widget.style.multipleSelect) {
          let selectedItems = $scope.selectedItems;
          if ($scope.isSelected(itemData)) {
            $scope.selectedItems = selectedItems.filter((f) => f !== itemData);
          } else {
            $scope.selectedItems = selectedItems.concat(itemData).sort();
          }
        } else {
          $scope.selectedItems = [itemData];
        }

        updateApply();
        updateSelectAll();
      };

      function updateSelectAll() {
        let selectedItems = $scope.selectedItems;

        $scope.allSelected = selectedItems.length === widget.queryResult.length;
        $scope.someSelected = !$scope.allSelected && selectedItems.length;
      }

      $scope.toggleSelectAll = function() {
        if ($scope.appstate !== 'dashboard') { return; }

        if ($scope.allSelected) {
          $scope.selectedItems = [];
        } else {
          $scope.selectedItems = widget.queryResult.map((item) => item.data.toString()).sort();
        }

        updateApply();
        updateSelectAll();
      };

      function updateApply() {
        $('.wiser-formula-widget__apply').attr('disabled', !changesMade());
      }

      function changesMade() {
        return !_.isEqual($scope.selectedItems, $scope.originalSelection);
      }

      $scope.cancelChanges = function() {
        updateSelection();
        closeDropdown();
      };

      $scope.updateFilters = function() {
        closeDropdown();

        if (!changesMade()) { return; }

        let members = $scope.selectedItems;

        let all = members.length === 0 ||
                  members.length === widget.queryResult.length;

        let dimensionPanel = widget.metadata.panel(PANEL_FILTER_DIMENSION);
        let filterDimension = dimensionPanel.items[0];

        console.log("Dim panel: " + dimensionPanel.toString());
        console.log("Filter dim: " + filterDimension.toString());
        console.log("Widgets: " + prism.activeDashboard.widgets.$$widgets)

        //Start modifying formulas
        var widgetList = prism.activeDashboard.widgets.$$widgets;
        widgetList.forEach((widget) => {
            widget.on('buildquery', function (w, res) {
                //context from numbered panel. modify based on position in widget editor
                context = res.query.metadata[2].jaql.context;
                //loop through context to find part of formula that needs to be changed
                for (f in context) {
                  if (context[f].dim == filterDimension) {
                      context[f].filter.members = members;
                  }
                }
            })
    
            widget.changesMade();
            widget.refresh();
        })
      };


      // For now, disable animation until we can do it properly
      $animate.enabled($element, false);
    }
  };
}]);
