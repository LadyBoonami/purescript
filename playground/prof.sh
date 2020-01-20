#!/bin/bash

while [ -n "$1" ]; do
	case "$1" in
		"clean")
			rm -r output
			shift
		;;

		"touch")
			touch src/*.purs
			shift
		;;

		"on")
			pushd "$HOME/.local/bin/"
			ln -sfv purs-prof purs
			popd
			shift
		;;

		"off")
			pushd "$HOME/.local/bin/"
			ln -sfv purs-vanilla purs
			popd
			shift
		;;

		"build")
			./mkln.sh
			./npm-do.sh pulp build
			shift
		;;

		*)
			echo "Usage: $0 <on|off>"
		;;
	esac
done
